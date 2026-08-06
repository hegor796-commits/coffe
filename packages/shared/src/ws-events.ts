import type { OrderStatus } from './enums';

/** Имена WS-событий (socket.io). */
export const WsEvent = {
  /** Новый заказ появился в точке (для бариста). */
  OrderCreated: 'order.created',
  /** Статус заказа изменился (для клиента и бариста). */
  OrderUpdated: 'order.updated',
  /** Стоп-лист точки изменился. */
  StopListUpdated: 'stoplist.updated',
} as const;

/** Комнаты socket.io. */
export const wsRooms = {
  location: (locationId: string) => `location:${locationId}`,
  order: (orderId: string) => `order:${orderId}`,
};

export interface OrderUpdatedPayload {
  orderId: string;
  locationId: string;
  status: OrderStatus;
  number: string;
  readyAtPromised: string | null;
}
