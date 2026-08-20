import { Body, Controller, Ip, Logger, Param, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthContext } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
import { ZodBody } from '../common/zod.pipe';
import { AppConfig } from '../config/configuration';
import { PaymentsService } from './payments.service';
import { ipAllowed } from './ip-allowlist';

const paySchema = z.object({
  email: z.string().email().max(160).optional(),
  phone: z.string().max(32).optional(),
});

@Controller('v1')
export class PaymentsController {
  private readonly logger = new Logger('PaymentsWebhook');

  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** Клиент запрашивает оплату заказа — в ответ ссылка на страницу ЮKassa. */
  @Post('orders/:id/pay')
  pay(
    @CurrentUser() user: AuthContext,
    @Param('id') orderId: string,
    @Body(new ZodBody(paySchema)) dto: z.infer<typeof paySchema>,
  ) {
    return this.payments.payOrder(user.tenantId, user.sub, orderId, dto);
  }

  /**
   * HTTP-уведомления ЮKassa. Публичный эндпоинт: подписи у уведомлений нет,
   * поэтому защита двухслойная — проверка IP отправителя и перезапрос
   * платежа через API (телу уведомления не доверяем).
   *
   * Всегда отвечаем 200: любой другой код ЮKassa считает недоставкой и
   * повторяет уведомление сутки. Ошибки обрабатываем через сверку.
   */
  @Public()
  @Post('webhooks/yookassa/:tenantId')
  async webhook(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Ip() ip: string,
    @Req() req: { headers: Record<string, string | string[] | undefined> },
  ): Promise<{ ok: boolean }> {
    const allowed = this.config.get('yookassa', { infer: true }).webhookAllowedIps;
    // За прокси Railway реальный адрес приходит в X-Forwarded-For.
    const forwarded = req.headers['x-forwarded-for'];
    const source = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || ip;

    if (!ipAllowed(source, allowed)) {
      this.logger.warn(`Уведомление с недоверенного адреса ${source} — отброшено`);
      return { ok: true };
    }

    try {
      await this.payments.handleWebhook(tenantId, body);
    } catch (e) {
      this.logger.error(`Обработка уведомления не удалась: ${(e as Error).message}`);
    }
    return { ok: true };
  }
}
