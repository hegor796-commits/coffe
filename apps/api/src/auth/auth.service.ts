import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@coffee/shared';
import { PrismaService } from '../prisma/prisma.service';
import { validateInitData, type TelegramUser } from './telegram-initdata';
import { JwtPayload } from './auth.types';
import { AppConfig } from '../config/configuration';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  role: Role;
  tenant: { id: string; slug: string; name: string; branding: unknown; paymentMode: string };
  locationId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Логин из Mini App. Проверяет initData, определяет тенанта из start_param,
   * решает роль (сотрудник или клиент), обрабатывает join-приглашения.
   */
  async loginWithInitData(initData: string, tenantSlugHint?: string): Promise<LoginResult> {
    const botToken = this.config.get('telegram', { infer: true }).botToken;
    // Telegram может отдавать WebView закэшированный initData с момента первого
    // открытия. Часовой лимит из спеки слишком строг для реального использования
    // (пользователь открыл бота, отвлёкся, вернулся) — по умолчанию сутки,
    // настраивается через TELEGRAM_INITDATA_TTL (в секундах).
    const initDataTtl = Number(process.env.TELEGRAM_INITDATA_TTL ?? 86400);
    let parsed;
    try {
      parsed = validateInitData(initData, botToken, initDataTtl);
    } catch (e) {
      throw new UnauthorizedException((e as Error).message);
    }

    const tgUserId = String(parsed.user.id);
    const startParam = parsed.startParam ?? tenantSlugHint;

    // Приглашение сотрудника: startapp=join_<token>
    if (startParam?.startsWith('join_')) {
      const token = startParam.slice('join_'.length);
      return this.acceptInvite(token, parsed.user);
    }

    // Определяем тенанта: startapp=<slug>
    const tenant = await this.resolveTenant(startParam);
    if (!tenant) {
      throw new UnauthorizedException('Кофейня не найдена (некорректный start_param)');
    }

    // Есть ли этот пользователь среди персонала тенанта?
    const staff = await this.prisma.staffUser.findUnique({
      where: { tenantId_tgUserId: { tenantId: tenant.id, tgUserId } },
    });

    // Диагностика: видно, какой tgUserId прислал Telegram, в каком тенанте
    // искали персонал и что нашли. Помогает понять, почему роль = client.
    this.logger.log(
      `вход: tgUserId=${tgUserId}, tenant=${tenant.slug}, ` +
        `staff=${staff ? `${staff.role}${staff.isActive ? '' : ' (неактивен)'}` : 'не найден → client'}`,
    );

    if (staff && staff.isActive) {
      return this.issueTokens(
        { sub: staff.id, tenantId: tenant.id, role: staff.role as Role, tgUserId, locationId: staff.locationId ?? undefined },
        tenant,
      );
    }

    // Иначе — клиент. Заводим/обновляем глобальный профиль.
    const customer = await this.prisma.customer.upsert({
      where: { tgUserId },
      create: { tgUserId, name: this.displayName(parsed.user) },
      update: { name: this.displayName(parsed.user) },
    });
    await this.prisma.tenantCustomer.upsert({
      where: { tenantId_customerId: { tenantId: tenant.id, customerId: customer.id } },
      create: { tenantId: tenant.id, customerId: customer.id },
      update: {},
    });

    return this.issueTokens(
      { sub: customer.id, tenantId: tenant.id, role: Role.Client, tgUserId },
      tenant,
    );
  }

  private async acceptInvite(token: string, user: TelegramUser): Promise<LoginResult> {
    const invite = await this.prisma.staffInvite.findUnique({
      where: { token },
      include: { tenant: true },
    });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw new UnauthorizedException('Приглашение недействительно или истекло');
    }
    const tgUserId = String(user.id);

    const staff = await this.prisma.$transaction(async (tx) => {
      const created = await tx.staffUser.upsert({
        where: { tenantId_tgUserId: { tenantId: invite.tenantId, tgUserId } },
        create: {
          tenantId: invite.tenantId,
          locationId: invite.locationId,
          role: invite.role,
          tgUserId,
          name: invite.name ?? this.displayName(user),
          invitedBy: invite.id,
        },
        update: { isActive: true, role: invite.role, locationId: invite.locationId },
      });
      await tx.staffInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedByTgId: tgUserId },
      });
      return created;
    });

    return this.issueTokens(
      {
        sub: staff.id,
        tenantId: invite.tenantId,
        role: staff.role as Role,
        tgUserId,
        locationId: staff.locationId ?? undefined,
      },
      invite.tenant,
    );
  }

  private async resolveTenant(startParam?: string) {
    // Явно указанная кофейня (deep-link ?startapp=<slug>).
    if (startParam) {
      return this.prisma.tenant.findUnique({ where: { slug: startParam } });
    }
    // Нет start_param (напр. вход через кнопку меню бота) — берём кофейню
    // по умолчанию. Для одиночной инсталляции это демо-кофейня.
    const defaultSlug = process.env.DEFAULT_TENANT_SLUG ?? 'demo';
    return this.prisma.tenant.findUnique({ where: { slug: defaultSlug } });
  }

  private issueTokens(
    payload: JwtPayload,
    tenant: { id: string; slug: string; name: string; branding: unknown; paymentMode: string },
  ): LoginResult {
    const jwtConf = this.config.get('jwt', { infer: true });
    const accessToken = this.jwt.sign(payload, {
      expiresIn: jwtConf.accessTtl as unknown as number,
    });
    const refreshToken = this.jwt.sign(
      { sub: payload.sub, tenantId: payload.tenantId, typ: 'refresh' },
      { expiresIn: jwtConf.refreshTtl as unknown as number },
    );
    return {
      accessToken,
      refreshToken,
      role: payload.role,
      locationId: payload.locationId,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        branding: tenant.branding,
        paymentMode: tenant.paymentMode,
      },
    };
  }

  private displayName(user: TelegramUser): string {
    const first = user.first_name ?? '';
    const last = user.last_name ?? '';
    return `${first} ${last}`.trim() || user.username || 'Гость';
  }
}
