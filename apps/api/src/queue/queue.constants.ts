/** Имена очередей BullMQ. */
export const QUEUES = {
  Notifications: 'notifications',
  OrderTimeouts: 'order-timeouts',
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

/** Минуты до автоотмены непринятого заказа. */
export const AUTO_CANCEL_MINUTES = 5;
/** Минуты до первой эскалации бариста. */
export const ESCALATION_MINUTES = 3;
