/** Роли пользователей внутри одного тенанта. */
export enum Role {
  Client = 'client',
  Barista = 'barista',
  Manager = 'manager',
  Owner = 'owner',
}

/** Роли персонала (хранятся в staff_user). client не хранится — это отсутствие записи. */
export const STAFF_ROLES = [Role.Barista, Role.Manager, Role.Owner] as const;

/** Роли с доступом к админке (меню, сотрудники, статистика). */
export const ADMIN_ROLES = [Role.Manager, Role.Owner] as const;

/** Статусы заказа. Порядок отражает жизненный цикл. */
export enum OrderStatus {
  /** Создан клиентом, ждёт реакции бариста (режим offline). */
  Created = 'created',
  /** Ждёт онлайн-оплаты (режим online, фаза 2). */
  PendingPayment = 'pending_payment',
  /** Оплачен онлайн, ждёт реакции бариста (режим online). */
  Paid = 'paid',
  /** Бариста принял заказ в работу. */
  Accepted = 'accepted',
  /** Готовится. */
  Preparing = 'preparing',
  /** Готов к выдаче. */
  Ready = 'ready',
  /** Выдан клиенту — терминальный. */
  Completed = 'completed',
  /** Отклонён бариста (напр. стоп-лист) — терминальный. */
  Rejected = 'rejected',
  /** Автоотмена: не принят за отведённое время — терминальный. */
  AutoCancelled = 'auto_cancelled',
  /** Отменён клиентом до принятия — терминальный. */
  CancelledByClient = 'cancelled_by_client',
}

/** Терминальные статусы — дальнейшие переходы запрещены. */
export const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.Completed,
  OrderStatus.Rejected,
  OrderStatus.AutoCancelled,
  OrderStatus.CancelledByClient,
];

/** Активные для бариста статусы (показываются в ленте). */
export const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.Created,
  OrderStatus.Paid,
  OrderStatus.Accepted,
  OrderStatus.Preparing,
  OrderStatus.Ready,
];

/** События, инициирующие переходы. */
export enum OrderEvent {
  Pay = 'pay',
  Accept = 'accept',
  StartPreparing = 'start_preparing',
  MarkReady = 'mark_ready',
  Complete = 'complete',
  Reject = 'reject',
  AutoCancel = 'auto_cancel',
  CancelByClient = 'cancel_by_client',
}

/** Режим оплаты тенанта. */
export enum PaymentMode {
  /** Оплата при получении на кассе (MVP). */
  Offline = 'offline',
  /** Онлайн-оплата через эквайринг кофейни (фаза 2). */
  Online = 'online',
}

/** Каналы клиента. */
export enum Channel {
  Tma = 'tma',
  Web = 'web',
}

/** Тарифные планы тенанта. */
export enum TenantPlan {
  Trial = 'trial',
  Basic = 'basic',
  Pro = 'pro',
}

export enum TenantStatus {
  Active = 'active',
  Suspended = 'suspended',
}
