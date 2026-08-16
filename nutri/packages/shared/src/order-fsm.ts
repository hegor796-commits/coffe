import { OrderStatus, OrderEvent } from './enums';

/**
 * Единая машина состояний заказа. Источник истины и для бэка, и для фронта.
 * Ключ — текущий статус, значение — карта событие → новый статус.
 */
export const ORDER_TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<OrderEvent, OrderStatus>>
> = {
  [OrderStatus.Created]: {
    // offline: сразу к бариста
    [OrderEvent.Accept]: OrderStatus.Accepted,
    [OrderEvent.Reject]: OrderStatus.Rejected,
    [OrderEvent.AutoCancel]: OrderStatus.AutoCancelled,
    [OrderEvent.CancelByClient]: OrderStatus.CancelledByClient,
    // online: ждём оплату
    [OrderEvent.Pay]: OrderStatus.PendingPayment,
  },
  [OrderStatus.PendingPayment]: {
    [OrderEvent.Pay]: OrderStatus.Paid,
    [OrderEvent.AutoCancel]: OrderStatus.AutoCancelled,
    [OrderEvent.CancelByClient]: OrderStatus.CancelledByClient,
  },
  [OrderStatus.Paid]: {
    [OrderEvent.Accept]: OrderStatus.Accepted,
    [OrderEvent.Reject]: OrderStatus.Rejected,
    [OrderEvent.AutoCancel]: OrderStatus.AutoCancelled,
  },
  [OrderStatus.Accepted]: {
    [OrderEvent.StartPreparing]: OrderStatus.Preparing,
    [OrderEvent.Reject]: OrderStatus.Rejected,
  },
  [OrderStatus.Preparing]: {
    [OrderEvent.MarkReady]: OrderStatus.Ready,
  },
  [OrderStatus.Ready]: {
    [OrderEvent.Complete]: OrderStatus.Completed,
  },
  [OrderStatus.Completed]: {},
  [OrderStatus.Rejected]: {},
  [OrderStatus.AutoCancelled]: {},
  [OrderStatus.CancelledByClient]: {},
};

/** Возвращает целевой статус для события или null, если переход недопустим. */
export function nextStatus(current: OrderStatus, event: OrderEvent): OrderStatus | null {
  return ORDER_TRANSITIONS[current]?.[event] ?? null;
}

export function canTransition(current: OrderStatus, event: OrderEvent): boolean {
  return nextStatus(current, event) !== null;
}
