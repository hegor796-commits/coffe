import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Role, WsEvent, type InviteStaffDto } from '@coffee/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuthContext } from '../auth/auth.types';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // --- Стоп-лист (бариста) ---

  /** Переключает доступность товара или опции в точке. */
  async toggleStopItem(
    user: AuthContext,
    locationId: string,
    target: { productId?: string; optionId?: string; stopped: boolean; untilMinutes?: number },
  ) {
    this.assertLocationAccess(user, locationId);
    await this.assertLocationOwned(user.tenantId, locationId);

    const where = {
      locationId,
      productId: target.productId ?? null,
      optionId: target.optionId ?? null,
    };

    // Идемпотентная установка: сносим прежнюю запись и, если ставим стоп, создаём новую.
    // (compound-unique с nullable-полями в Prisma не поддерживает upsert по null-ключу.)
    await this.prisma.stopListItem.deleteMany({ where });
    if (target.stopped) {
      const until = target.untilMinutes
        ? new Date(Date.now() + target.untilMinutes * 60_000)
        : null;
      await this.prisma.stopListItem.create({ data: { ...where, until } });
    }

    this.realtime.emitToLocation(locationId, WsEvent.StopListUpdated, { locationId });
    return { ok: true };
  }

  listStopItems(user: AuthContext, locationId: string) {
    this.assertLocationAccess(user, locationId);
    return this.prisma.stopListItem.findMany({ where: { locationId } });
  }

  /** Пауза/возобновление приёма заказов точкой. */
  async setAcceptingOrders(user: AuthContext, locationId: string, accepting: boolean) {
    this.assertLocationAccess(user, locationId);
    await this.assertLocationOwned(user.tenantId, locationId);
    return this.prisma.location.update({
      where: { id: locationId },
      data: { isAcceptingOrders: accepting },
    });
  }

  // --- Сотрудники и приглашения (админ) ---

  listStaff(tenantId: string) {
    return this.prisma.staffUser.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  }

  async deactivateStaff(tenantId: string, staffId: string) {
    const staff = await this.prisma.staffUser.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) throw new NotFoundException('Сотрудник не найден');
    if (staff.role === Role.Owner) {
      throw new ForbiddenException('Нельзя деактивировать владельца');
    }
    return this.prisma.staffUser.update({ where: { id: staffId }, data: { isActive: false } });
  }

  /** Создаёт одноразовое приглашение и возвращает deep-link для бариста. */
  async createInvite(tenantId: string, botUsername: string, dto: InviteStaffDto) {
    await this.assertLocationOwned(tenantId, dto.locationId);
    const token = nanoid(24);
    const invite = await this.prisma.staffInvite.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        role: dto.role,
        token,
        name: dto.name,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    const link = `https://t.me/${botUsername}/app?startapp=join_${token}`;
    return { inviteId: invite.id, link, expiresAt: invite.expiresAt };
  }

  // --- Точки (админ) ---

  listLocations(tenantId: string) {
    return this.prisma.location.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  }

  createLocation(
    tenantId: string,
    data: { name: string; address?: string; timezone?: string; maxOrdersPerSlot?: number },
  ) {
    return this.prisma.location.create({ data: { tenantId, ...data } });
  }

  async updateLocation(
    tenantId: string,
    id: string,
    data: Partial<{
      name: string;
      address: string;
      timezone: string;
      maxOrdersPerSlot: number;
      slotMinutes: number;
      schedule: object;
    }>,
  ) {
    await this.assertLocationOwned(tenantId, id);
    return this.prisma.location.update({ where: { id }, data });
  }

  // --- проверки ---

  private assertLocationAccess(user: AuthContext, locationId: string): void {
    if (user.role === Role.Barista && user.locationId && user.locationId !== locationId) {
      throw new ForbiddenException('Другая точка');
    }
  }

  private async assertLocationOwned(tenantId: string, locationId: string): Promise<void> {
    const loc = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
      select: { id: true },
    });
    if (!loc) throw new NotFoundException('Точка не найдена');
  }
}
