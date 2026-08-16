import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { wsRooms, WsEvent } from '@coffee/shared';
import { JwtPayload } from '../auth/auth.types';

/**
 * WebSocket-шлюз: лента бариста (комната точки) и трекер клиента (комната заказа).
 * WS — только «пинок»; источник истины — REST. При реконнекте фронт рефетчит.
 * Авторизация — тем же JWT, передаётся в auth.token при подключении.
 */
@WebSocketGateway({ cors: { origin: '*' }, transports: ['websocket', 'polling'] })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket): void {
    const token = (client.handshake.auth?.token as string) ?? '';
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      client.data.user = payload;
    } catch {
      client.disconnect(true);
    }
  }

  /** Бариста подписывается на ленту своей точки. Проверяем принадлежность. */
  @SubscribeMessage('subscribe:location')
  subscribeLocation(@ConnectedSocket() client: Socket, @MessageBody() locationId: string): void {
    const user = client.data.user as JwtPayload | undefined;
    if (!user || (user.role !== 'barista' && user.role !== 'manager' && user.role !== 'owner')) {
      return;
    }
    // Бариста привязан к своей точке; менеджер/владелец — к любой точке тенанта.
    if (user.role === 'barista' && user.locationId && user.locationId !== locationId) return;
    client.join(wsRooms.location(locationId));
  }

  /** Клиент подписывается на статус конкретного заказа. */
  @SubscribeMessage('subscribe:order')
  subscribeOrder(@ConnectedSocket() client: Socket, @MessageBody() orderId: string): void {
    if (!client.data.user) return;
    client.join(wsRooms.order(orderId));
  }

  /** Публикует событие в комнату точки (новый заказ / стоп-лист). */
  emitToLocation(locationId: string, event: string, payload: unknown): void {
    this.server?.to(wsRooms.location(locationId)).emit(event, payload);
  }

  /** Публикует событие в комнату заказа (обновление статуса). */
  emitToOrder(orderId: string, event: string, payload: unknown): void {
    this.server?.to(wsRooms.order(orderId)).emit(event, payload);
  }

  /** Хелпер: разослать обновление статуса и в комнату заказа, и в ленту точки. */
  broadcastOrderUpdate(locationId: string, orderId: string, payload: unknown): void {
    this.emitToOrder(orderId, WsEvent.OrderUpdated, payload);
    this.emitToLocation(locationId, WsEvent.OrderUpdated, payload);
  }
}
