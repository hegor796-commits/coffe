import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ACTIVE_STATUSES,
  canTransition,
  Channel,
  nextStatus,
  OrderEvent,
  OrderStatus,
  PaymentMode,
  Role,
  TERMINAL_STATUSES,
  type CreateOrderDto,
  type OrderUpdatedPayload,
  WsEvent,
} from '@coffee/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrderPricingService } from './order-pricing.service';
import { OrderNumberService } from './order-number.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { QueueService } from '../queue/queue.service';
import {
  AUTO_CANCEL_MINUTES,
  PAYMENT_JOBS,
  PAYMENT_TIMEOUT_MINUTES,
  TIMEOUT_JOBS,
} from '../queue/queue.constants';
import { AuthContext } from '../auth/auth.types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('Orders');

  /**
   * Best-effort побочка: реалтайм/бот/очередь не должны ронять уже
   * сохранённый заказ. Если недоступен Redis (нет сервиса на проде) или бот —
   * логируем и продолжаем, а не отдаём клиенту 500.
   */
  private async safe(label: string, fn: () => Promise<void> | void): Promise<void> {
    try {
      // Таймаут: если Redis недоступен, ioredis может ждать соединение —
      // не даём побочке подвесить ответ клиенту.
      await Promise.race([
        Promise.resolve(fn()),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('таймаут 3с')), 3000),
        ),
      ]);
    } catch (e) {
      this.logger.warn(`Побочка «${label}» не выполнена: ${(e as Error).message}`);
    }
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: OrderPricingService,
    private readonly numbers: OrderNumberService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
    private readonly queue: QueueService,
  ) {}

  /** Создание заказа клиентом. Цена и снапшот считаются на сервере. */
  async create(user: AuthContext, dto: CreateOrderDto) {
    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, tenantId: user.tenantId },
      include: { tenant: true },
    });
    if (!location) throw new NotFoundException('Точка не найдена');
    if (!location.isAcceptingOrders) {
      throw new BadRequestException('Точка сейчас не принимает заказы');
    }

    const { snapshot, total } = await this.pricing.buildSnapshot(
      user.tenantId,
      dto.locationId,
      dto.items,
    );

    const readyAtRequested = dto.readyAtRequested ? new Date(dto.readyAtRequested) : null;
    const readyAtPromised = await this.computePromisedTime(location, readyAtRequested);

    await this.assertSlotCapacity(location.id, readyAtPromised, location.maxOrdersPerSlot);

    const number = await this.numbers.next(location.id, location.timezone);
    const paymentMode = location.tenant.paymentMode as PaymentMode;
    // offline: заказ сразу ждёт бариста. online: сначала оплата, к бариста
    // заказ попадает только после подтверждения от эквайринга.
    const status =
      paymentMode === PaymentMode.Online ? OrderStatus.PendingPayment : OrderStatus.Created;

    const order = await this.prisma.order.create({
      data: {
        tenantId: user.tenantId,
        locationId: location.id,
        customerId: user.sub,
        number,
        status,
        paymentMode,
        items: snapshot as unknown as object,
        total,
        channel: dto.channel ?? Channel.Tma,
        comment: dto.comment,
        readyAtRequested,
        readyAtPromised,
        statusHistory: [{ status, at: new Date().toISOString(), by: 'client' }],
      },
    });

    // updateMany (а не update) не бросает P2025, если связки ещё нет —
    // счётчик не критичен и не должен ронять заказ.
    await this.prisma.tenantCustomer.updateMany({
      where: { tenantId: user.tenantId, customerId: user.sub },
      data: { ordersCount: { increment: 1 } },
    });

    // Реалтайм в ленту бариста + уведомление в бот + отложенная автоотмена.
    // Все три — best-effort: сбой Redis/бота не должен ронять заказ клиента.
    // Неоплаченный заказ бариста не показываем и в бот не шлём: до оплаты
    // его может и не быть. Оба уведомления уйдут при переходе в paid.
    if (status !== OrderStatus.PendingPayment) {
      await this.safe('realtime OrderCreated', () =>
        this.realtime.emitToLocation(location.id, WsEvent.OrderCreated, this.toUpdatePayload(order)),
      );
      await this.safe('notifyNewOrder', () => this.notifications.notifyNewOrder(order.id));
    }
    await this.safe('scheduleAutoCancel', () => this.scheduleAutoCancel(order.id, paymentMode));

    return this.serialize(order);
  }

  /** Получить заказ (клиент — только свой; персонал — своего тенанта). */
  async getOne(user: AuthContext, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: user.tenantId },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (user.role === Role.Client && order.customerId !== user.sub) {
      throw new ForbiddenException('Это не ваш заказ');
    }
    return this.serialize(order);
  }

  /** История заказов клиента. */
  async listMine(user: AuthContext) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId: user.tenantId, customerId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return orders.map((o) => this.serialize(o));
  }

  /** Активные заказы точки для бариста. */
  async listActive(user: AuthContext, locationId: string) {
    this.assertStaffLocation(user, locationId);
    const orders = await this.prisma.order.findMany({
      where: { tenantId: user.tenantId, locationId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'asc' },
    });
    return orders.map((o) => this.serialize(o));
  }

  /** Клиент отменяет свой заказ (до принятия). */
  async cancelByClient(user: AuthContext, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: user.tenantId, customerId: user.sub },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return this.applyTransition(order, OrderEvent.CancelByClient, 'client');
  }

  /** Переход статуса персоналом (accept/preparing/ready/complete/reject). */
  async staffTransition(user: AuthContext, orderId: string, event: OrderEvent) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: user.tenantId },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    this.assertStaffLocation(user, order.locationId);
    return this.applyTransition(order, event, `staff:${user.sub}`);
  }

  /**
   * Заказ оплачен онлайн (вызывается платёжным модулем по подтверждению
   * эквайринга). Здесь же заказ впервые появляется у бариста.
   */
  async markPaid(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    if (!canTransition(order.status as OrderStatus, OrderEvent.Pay)) return;

    await this.applyTransition(order, OrderEvent.Pay, 'payment');

    // Оплаченный заказ — это «новый заказ» для точки: лента и бот.
    const fresh = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!fresh) return;
    await this.safe('realtime OrderCreated', () =>
      this.realtime.emitToLocation(fresh.locationId, WsEvent.OrderCreated, this.toUpdatePayload(fresh)),
    );
    await this.safe('notifyNewOrder', () => this.notifications.notifyNewOrder(orderId));
    // С момента оплаты у бариста снова обычный таймер на принятие заказа.
    await this.safe('rescheduleAutoCancel', () => this.scheduleAutoCancel(orderId, PaymentMode.Offline));
  }

  /** Автоотмена из воркера таймаутов (без пользовательского контекста). */
  async autoCancel(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    if (!canTransition(order.status as OrderStatus, OrderEvent.AutoCancel)) return;
    await this.applyTransition(order, OrderEvent.AutoCancel, 'system');
  }

  // --- внутреннее ---

  private async applyTransition(
    order: {
      id: string;
      status: OrderStatus | string;
      locationId: string;
      statusHistory: unknown;
      paymentMode: PaymentMode | string;
    },
    event: OrderEvent,
    by: string,
  ) {
    const current = order.status as OrderStatus;
    const target = nextStatus(current, event);
    if (!target) {
      throw new BadRequestException(`Недопустимый переход: ${current} → ${event}`);
    }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: target,
        statusHistory: [...history, { status: target, at: new Date().toISOString(), by }],
      },
    });

    // Побочки — best-effort: сбой Redis/бота не должен ронять смену статуса.
    const payload = this.toUpdatePayload(updated);
    await this.safe('realtime OrderUpdated', () =>
      this.realtime.broadcastOrderUpdate(order.locationId, order.id, payload),
    );
    await this.safe('notifyStatus', () => this.notifications.notifyStatus(order.id));

    // Заказ принят/терминален — снимаем отложенную автоотмену.
    if (target !== OrderStatus.Created && target !== OrderStatus.Paid) {
      await this.safe('cancelAutoCancel', () => this.cancelAutoCancel(order.id));
    }

    // Онлайн-заказ отменён после оплаты — деньги надо вернуть. Ставим в
    // очередь (ретраи), а не дёргаем API прямо здесь: смена статуса не должна
    // зависеть от доступности эквайринга. Подстраховка — периодическая сверка.
    if (TERMINAL_STATUSES.includes(target) && order.paymentMode === PaymentMode.Online) {
      await this.safe('scheduleRefund', () => this.scheduleRefund(order.id));
    }

    return this.serialize(updated);
  }

  private async computePromisedTime(
    location: { slotMinutes: number },
    requested: Date | null,
  ): Promise<Date> {
    const now = new Date();
    // ASAP: текущее время + минимальное время готовности (по умолчанию 1 слот).
    const asap = new Date(now.getTime() + location.slotMinutes * 60_000);
    if (!requested) return asap;
    // Нельзя просить «в прошлом» или раньше ASAP.
    return requested.getTime() < asap.getTime() ? asap : requested;
  }

  private async assertSlotCapacity(
    locationId: string,
    promised: Date,
    maxPerSlot: number,
  ): Promise<void> {
    // Считаем активные заказы, чья готовность попадает в тот же слот.
    const slotStart = new Date(promised);
    slotStart.setSeconds(0, 0);
    const windowMs = 15 * 60_000;
    const from = new Date(slotStart.getTime() - windowMs);
    const to = new Date(slotStart.getTime() + windowMs);
    const count = await this.prisma.order.count({
      where: {
        locationId,
        status: { in: ACTIVE_STATUSES },
        readyAtPromised: { gte: from, lte: to },
      },
    });
    if (count >= maxPerSlot) {
      throw new BadRequestException('На это время слишком много заказов, выберите другое время');
    }
  }

  private async scheduleAutoCancel(orderId: string, mode: PaymentMode): Promise<void> {
    const minutes = mode === PaymentMode.Online ? PAYMENT_TIMEOUT_MINUTES : AUTO_CANCEL_MINUTES;
    // Тот же jobId — повторная постановка после оплаты заменяет платёжный
    // таймер обычным, а не добавляет вторую автоотмену.
    await this.cancelAutoCancel(orderId);
    await this.queue.orderTimeouts.add(
      TIMEOUT_JOBS.AutoCancel,
      { orderId },
      {
        delay: minutes * 60_000,
        jobId: `autocancel:${orderId}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  /** Возврат по отменённому оплаченному заказу — через очередь с ретраями. */
  private async scheduleRefund(orderId: string): Promise<void> {
    await this.queue.payments.add(
      PAYMENT_JOBS.Refund,
      { orderId },
      {
        jobId: `refund:${orderId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );
  }

  private async cancelAutoCancel(orderId: string): Promise<void> {
    const job = await this.queue.orderTimeouts.getJob(`autocancel:${orderId}`);
    await job?.remove().catch(() => undefined);
  }

  private assertStaffLocation(user: AuthContext, locationId: string): void {
    if (user.role === Role.Client) throw new ForbiddenException('Недостаточно прав');
    if (user.role === Role.Barista && user.locationId && user.locationId !== locationId) {
      throw new ForbiddenException('Другая точка');
    }
  }

  private toUpdatePayload(order: {
    id: string;
    locationId: string;
    status: string;
    number: string;
    readyAtPromised: Date | null;
  }): OrderUpdatedPayload {
    return {
      orderId: order.id,
      locationId: order.locationId,
      status: order.status as OrderStatus,
      number: order.number,
      readyAtPromised: order.readyAtPromised ? order.readyAtPromised.toISOString() : null,
    };
  }

  private serialize(order: Record<string, unknown>) {
    return {
      ...order,
      isTerminal: TERMINAL_STATUSES.includes(order.status as OrderStatus),
    };
  }
}
