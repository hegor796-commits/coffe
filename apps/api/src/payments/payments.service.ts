import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  OrderStatus,
  PaymentMode,
  TERMINAL_STATUSES,
  type OrderItemSnapshot,
} from '@coffee/shared';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentCredentialsService } from './payment-credentials.service';
import { kopecksToValue, YooKassaError, type YooPayment, type YooReceiptItem } from './yookassa.client';

/** Данные плательщика для чека 54-ФЗ (нужен email или телефон). */
export interface PayerContact {
  email?: string;
  phone?: string;
}

export interface PayResult {
  orderId: string;
  paymentId: string;
  status: string;
  /** Куда отправить клиента для оплаты. null, если платёж уже завершён. */
  confirmationUrl: string | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly creds: PaymentCredentialsService,
    private readonly orders: OrdersService,
  ) {}

  /**
   * Создать (или переиспользовать) платёж для заказа и вернуть ссылку на оплату.
   *
   * Повторный вызов на живом платеже возвращает ту же confirmation_url —
   * клиент может закрыть страницу оплаты и вернуться к ней позже.
   */
  async payOrder(tenantId: string, customerId: string, orderId: string, contact: PayerContact): Promise<PayResult> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { payment: true, tenant: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.customerId !== customerId) throw new ForbiddenException('Это не ваш заказ');
    if (order.paymentMode !== PaymentMode.Online) {
      throw new BadRequestException('Заказ оформлен с оплатой на кассе');
    }
    if (TERMINAL_STATUSES.includes(order.status as OrderStatus)) {
      throw new BadRequestException('Заказ уже завершён');
    }
    if (order.status !== OrderStatus.PendingPayment) {
      throw new BadRequestException('Заказ не ожидает оплаты');
    }

    const client = await this.creds.client(tenantId);

    // Живой платёж уже есть — отдаём его ссылку, второй раз не создаём.
    if (order.payment?.providerPaymentId && order.payment.status === 'pending') {
      try {
        const existing = await client.getPayment(order.payment.providerPaymentId);
        if (existing.status === 'pending' && existing.confirmation?.confirmation_url) {
          return {
            orderId,
            paymentId: order.payment.id,
            status: existing.status,
            confirmationUrl: existing.confirmation.confirmation_url,
          };
        }
        // Платёж уже не pending — синхронизируем состояние и выходим.
        const synced = await this.applyProviderPayment(tenantId, existing);
        return { orderId, paymentId: order.payment.id, status: synced, confirmationUrl: null };
      } catch (e) {
        this.logger.warn(`Не удалось получить платёж ${order.payment.providerPaymentId}: ${(e as Error).message}`);
      }
    }

    const contactForReceipt = await this.resolveContact(customerId, contact);
    const idempotenceKey = randomUUID();

    let created: YooPayment;
    try {
      created = await client.createPayment({
        amountValue: kopecksToValue(order.total),
        description: `Заказ ${order.number} — ${order.tenant.name}`.slice(0, 128),
        returnUrl: this.returnUrl(orderId),
        idempotenceKey,
        metadata: { orderId: order.id, tenantId, orderNumber: order.number },
        receipt: this.buildReceipt(order.items as unknown as OrderItemSnapshot[], contactForReceipt),
      });
    } catch (e) {
      if (e instanceof YooKassaError) {
        // 401 — неверные shopId/секрет; 403 — магазин не активирован или
        // способ оплаты не подключён. Отдаём причину клиенту как есть.
        throw new BadRequestException(`ЮKassa отклонила платёж: ${e.message}`);
      }
      throw e;
    }

    const payment = await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        provider: 'yookassa',
        providerPaymentId: created.id,
        status: this.mapStatus(created.status),
        amount: order.total,
        idempotencyKey: idempotenceKey,
        payload: created as unknown as object,
      },
      update: {
        providerPaymentId: created.id,
        status: this.mapStatus(created.status),
        amount: order.total,
        idempotencyKey: idempotenceKey,
        payload: created as unknown as object,
      },
    });

    this.logger.log(`Платёж ${created.id} создан для заказа ${order.number} (${kopecksToValue(order.total)} ₽)`);

    return {
      orderId,
      paymentId: payment.id,
      status: created.status,
      confirmationUrl: created.confirmation?.confirmation_url ?? null,
    };
  }

  /**
   * Обработка HTTP-уведомления ЮKassa.
   *
   * Тело уведомления не подписано, поэтому содержимому не доверяем: берём
   * оттуда только id платежа и перезапрашиваем объект через API по своим
   * ключам. Подделать уведомление это не даёт — максимум лишний запрос.
   */
  async handleWebhook(tenantId: string, body: unknown): Promise<void> {
    const event = body as { event?: string; object?: { id?: string } };
    const paymentId = event?.object?.id;
    if (!paymentId) {
      this.logger.warn(`Уведомление без id платежа: ${JSON.stringify(body).slice(0, 300)}`);
      return;
    }
    if (event.event?.startsWith('refund.')) {
      this.logger.log(`Уведомление о возврате ${paymentId} (${event.event}) — состояние заказа не меняем`);
      return;
    }

    const client = await this.creds.client(tenantId);
    const fresh = await client.getPayment(paymentId);
    await this.applyProviderPayment(tenantId, fresh);
  }

  /**
   * Привести заказ и запись payment в соответствие состоянию платежа
   * у провайдера. Идемпотентно: повторный вызов ничего не ломает.
   */
  async applyProviderPayment(tenantId: string, provider: YooPayment): Promise<string> {
    const orderId = provider.metadata?.orderId;
    const payment = orderId
      ? await this.prisma.payment.findUnique({ where: { orderId }, include: { order: true } })
      : await this.prisma.payment.findFirst({
          where: { providerPaymentId: provider.id },
          include: { order: true },
        });

    if (!payment) {
      this.logger.warn(`Платёж ${provider.id} не найден в БД (orderId=${orderId ?? '—'})`);
      return provider.status;
    }
    if (payment.order.tenantId !== tenantId) {
      this.logger.warn(`Платёж ${provider.id} относится к другому тенанту — игнорируем`);
      return provider.status;
    }

    const mapped = this.mapStatus(provider.status);
    if (payment.status !== mapped || payment.providerPaymentId !== provider.id) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: mapped,
          providerPaymentId: provider.id,
          payload: provider as unknown as object,
        },
      });
    }

    const orderStatus = payment.order.status as OrderStatus;

    if (provider.status === 'succeeded') {
      if (orderStatus === OrderStatus.PendingPayment) {
        await this.orders.markPaid(payment.orderId);
        this.logger.log(`Заказ ${payment.order.number} оплачен (платёж ${provider.id})`);
      } else if (TERMINAL_STATUSES.includes(orderStatus)) {
        // Деньги пришли после отмены — возвращаем, заказ уже не выполнить.
        await this.refundIfNeeded(payment.orderId);
      }
      return provider.status;
    }

    if (provider.status === 'canceled' && orderStatus === OrderStatus.PendingPayment) {
      const reason = provider.cancellation_details?.reason ?? 'без причины';
      this.logger.log(`Платёж ${provider.id} отменён (${reason}) — отменяем заказ ${payment.order.number}`);
      await this.orders.autoCancel(payment.orderId);
    }

    return provider.status;
  }

  /** Возврат денег по заказу, если он оплачен, но не будет выполнен. */
  async refundIfNeeded(orderId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });
    if (!payment?.providerPaymentId) return;
    if (payment.status !== 'succeeded') return;
    if (!TERMINAL_STATUSES.includes(payment.order.status as OrderStatus)) return;

    const client = await this.creds.client(payment.order.tenantId);
    // Ключ идемпотентности детерминированный: повтор задачи из очереди не
    // приведёт ко второму возврату той же суммы.
    const key = `refund:${payment.id}`;
    try {
      await client.createRefund(payment.providerPaymentId, kopecksToValue(payment.amount), key);
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'refunded' } });
      this.logger.log(`Возврат по заказу ${payment.order.number}: ${kopecksToValue(payment.amount)} ₽`);
    } catch (e) {
      this.logger.error(`Возврат по заказу ${payment.order.number} не прошёл: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Сверка зависших платежей: ЮKassa могла не доставить уведомление.
   * Берём всё, что висит в pending дольше двух минут, и спрашиваем провайдера.
   */
  async reconcile(): Promise<number> {
    const cutoff = new Date(Date.now() - 2 * 60_000);
    const stuck = await this.prisma.payment.findMany({
      where: { status: 'pending', providerPaymentId: { not: null }, updatedAt: { lt: cutoff } },
      include: { order: true },
      take: 50,
    });

    let synced = 0;
    for (const payment of stuck) {
      try {
        const client = await this.creds.client(payment.order.tenantId);
        const fresh = await client.getPayment(payment.providerPaymentId as string);
        await this.applyProviderPayment(payment.order.tenantId, fresh);
        synced += 1;
      } catch (e) {
        this.logger.warn(`Сверка платежа ${payment.providerPaymentId} не удалась: ${(e as Error).message}`);
      }
    }
    if (synced > 0) this.logger.log(`Сверка: обновлено платежей — ${synced}`);
    return synced;
  }

  // --- внутреннее ---

  private mapStatus(status: string): 'pending' | 'succeeded' | 'canceled' {
    if (status === 'succeeded') return 'succeeded';
    if (status === 'canceled') return 'canceled';
    return 'pending';
  }

  /**
   * Контакт для чека: берём присланный клиентом, иначе — сохранённый ранее.
   * Найденный контакт запоминаем, чтобы не спрашивать при каждом заказе.
   */
  private async resolveContact(customerId: string, contact: PayerContact): Promise<PayerContact> {
    const email = contact.email?.trim() || undefined;
    const phone = contact.phone?.trim() || undefined;

    if (email || phone) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { ...(email ? { email } : {}), ...(phone ? { phone } : {}) },
      });
      return { email, phone };
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    return { email: customer?.email ?? undefined, phone: customer?.phone ?? undefined };
  }

  /**
   * Чек 54-ФЗ. Формируется только если включена фискализация на стороне
   * ЮKassa (YOOKASSA_RECEIPT_ENABLED): при собственной кассе кофейни чек
   * пробивает она, и передавать receipt не нужно.
   */
  private buildReceipt(
    items: OrderItemSnapshot[],
    contact: PayerContact,
  ): { customer: PayerContact; items: YooReceiptItem[] } | undefined {
    const cfg = this.config.get('yookassa', { infer: true });
    if (!cfg.receiptEnabled) return undefined;
    if (!contact.email && !contact.phone) {
      throw new BadRequestException(
        'Для чека нужен email или телефон — укажите контакт при оформлении заказа',
      );
    }

    const receiptItems: YooReceiptItem[] = items.map((item) => ({
      description: item.name.slice(0, 128),
      quantity: String(item.quantity),
      // В чеке указывается цена за единицу; lineTotal = цена × количество.
      amount: { value: kopecksToValue(Math.round(item.lineTotal / item.quantity)), currency: 'RUB' },
      vat_code: cfg.vatCode,
      payment_subject: 'commodity',
      payment_mode: 'full_payment',
    }));

    return { customer: contact, items: receiptItems };
  }

  /** Адрес возврата после оплаты: Mini App, иначе публичный адрес фронта. */
  private returnUrl(orderId: string): string {
    const cfg = this.config.get('yookassa', { infer: true });
    const base = cfg.returnUrl || this.config.get('publicAppUrl', { infer: true });
    // Для ссылки на Mini App (t.me/bot/app) параметр называется startapp —
    // фронт разбирает его и открывает экран нужного заказа.
    const param = /t\.me\//.test(base) ? 'startapp' : 'order';
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}${param}=order_${orderId}`;
  }
}
