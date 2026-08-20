/** Имена очередей BullMQ. */
export const QUEUES = {
  Notifications: 'notifications',
  OrderTimeouts: 'order-timeouts',
  Payments: 'payments',
} as const;

/** Типы задач в очереди уведомлений. */
export const NOTIFY_JOBS = {
  /** Новый заказ → бариста точки и владельцу. */
  NewOrderToStaff: 'new-order-to-staff',
  /** Смена статуса → клиенту. */
  StatusToClient: 'status-to-client',
  /** Эскалация: заказ не принят за N минут. */
  Escalation: 'escalation',
} as const;

/** Типы задач в очереди таймаутов заказа. */
export const TIMEOUT_JOBS = {
  /** Автоотмена непринятого заказа. */
  AutoCancel: 'auto-cancel',
} as const;

/** Типы задач платёжной очереди. */
export const PAYMENT_JOBS = {
  /** Возврат денег по оплаченному, но отменённому заказу. */
  Refund: 'refund',
  /** Сверка зависших платежей с провайдером. */
  Reconcile: 'reconcile',
} as const;

/** Период сверки зависших платежей. */
export const RECONCILE_INTERVAL_MS = 60_000;

/** Минуты до автоотмены непринятого заказа. */
export const AUTO_CANCEL_MINUTES = 5;
/**
 * Минуты, отведённые на онлайн-оплату. Больше, чем на принятие заказа:
 * клиенту нужно время на страницу банка и подтверждение.
 */
export const PAYMENT_TIMEOUT_MINUTES = 15;
/** Минуты до первой эскалации бариста. */
export const ESCALATION_MINUTES = 3;
