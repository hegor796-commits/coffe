import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderDto, OrderEvent } from '@coffee/shared';
import { api } from './client';
import type { MenuResponse, OrderResponse } from './types';

export interface LocationBrief {
  id: string;
  name: string;
  address: string | null;
  isAcceptingOrders: boolean;
  timezone: string;
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () => api<LocationBrief[]>('/v1/locations'),
  });
}

export function useMenu(locationId: string | undefined) {
  return useQuery({
    queryKey: ['menu', locationId],
    enabled: !!locationId,
    queryFn: () => api<MenuResponse>(`/v1/menu?location=${locationId}`),
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'my'],
    queryFn: () => api<OrderResponse[]>('/v1/orders/my'),
  });
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: () => api<OrderResponse>(`/v1/orders/${orderId}`),
    refetchInterval: 15000, // страховка поверх WebSocket
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrderDto) => api<OrderResponse>('/v1/orders', { method: 'POST', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', 'my'] }),
  });
}

export interface PayResult {
  orderId: string;
  paymentId: string;
  status: string;
  confirmationUrl: string | null;
}

/** Запрос ссылки на оплату заказа. Контакт нужен для чека 54-ФЗ. */
export function usePayOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, email, phone }: { orderId: string; email?: string; phone?: string }) =>
      api<PayResult>(`/v1/orders/${orderId}/pay`, { method: 'POST', body: { email, phone } }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['order', vars.orderId] }),
  });
}

export function useCancelOrder(orderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<OrderResponse>(`/v1/orders/${orderId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
}

export function useStaffOrders(locationId: string | undefined) {
  return useQuery({
    queryKey: ['staff', 'orders', locationId],
    enabled: !!locationId,
    queryFn: () => api<OrderResponse[]>(`/v1/staff/orders?location=${locationId}`),
    refetchInterval: 20000,
  });
}

// --- Админ ---

export interface StaffMember {
  id: string;
  role: string;
  tgUserId: string;
  name: string | null;
  isActive: boolean;
  locationId: string | null;
}

export function useAdminStaff() {
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => api<StaffMember[]>('/v1/admin/staff'),
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { role: 'barista' | 'manager'; locationId: string; name?: string }) =>
      api<{ inviteId: string; link: string; expiresAt: string }>('/v1/admin/staff/invite', {
        method: 'POST',
        body: dto,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] }),
  });
}

export function useAdminLocations() {
  return useQuery({
    queryKey: ['admin', 'locations'],
    queryFn: () => api<LocationBrief[]>('/v1/admin/locations'),
  });
}

export function useToggleStop(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { productId?: string; optionId?: string; stopped: boolean }) =>
      api('/v1/staff/stop-list', { method: 'PUT', body: { locationId, ...dto } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu', locationId] }),
  });
}

export function usePauseLocation(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accepting: boolean) =>
      api('/v1/staff/location/pause', { method: 'PUT', body: { locationId, accepting } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  });
}

const EVENT_PATH: Record<string, string> = {
  accept: 'accept',
  start_preparing: 'preparing',
  mark_ready: 'ready',
  complete: 'complete',
  reject: 'reject',
};

export function useStaffTransition(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, event }: { orderId: string; event: OrderEvent }) =>
      api<OrderResponse>(`/v1/staff/orders/${orderId}/${EVENT_PATH[event]}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', 'orders', locationId] }),
  });
}
