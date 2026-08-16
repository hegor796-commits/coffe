import { io, Socket } from 'socket.io-client';
import { API_URL } from './api/client';
import { useAuth } from './store/auth';

let socket: Socket | null = null;

/** Ленивое создание сокета с текущим JWT. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token: useAuth.getState().accessToken },
    });
  }
  return socket;
}

export function subscribeLocation(locationId: string): void {
  getSocket().emit('subscribe:location', locationId);
}

export function subscribeOrder(orderId: string): void {
  getSocket().emit('subscribe:order', orderId);
}
