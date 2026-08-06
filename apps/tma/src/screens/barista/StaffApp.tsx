import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatMoney, OrderEvent, OrderStatus, WsEvent } from '@coffee/shared';
import { useAuth } from '../../store/auth';
import { useLocations, useStaffOrders, useStaffTransition } from '../../api/hooks';
import { getSocket, subscribeLocation } from '../../ws';
import { haptic } from '../../telegram';
import type { OrderResponse } from '../../api/types';

/** Действия, доступные по текущему статусу заказа. */
function actionsFor(status: OrderStatus): { event: OrderEvent; label: string; danger?: boolean }[] {
  switch (status) {
    case OrderStatus.Created:
    case OrderStatus.Paid:
      return [
        { event: OrderEvent.Accept, label: 'Принять' },
        { event: OrderEvent.Reject, label: 'Отклонить', danger: true },
      ];
    case OrderStatus.Accepted:
      return [{ event: OrderEvent.StartPreparing, label: 'Готовить' }];
    case OrderStatus.Preparing:
      return [{ event: OrderEvent.MarkReady, label: 'Готово' }];
    case OrderStatus.Ready:
      return [{ event: OrderEvent.Complete, label: 'Выдан' }];
    default:
      return [];
  }
}

export function StaffApp() {
  const auth = useAuth();
  const { data: locations } = useLocations();
  // Бариста привязан к своей точке; менеджер/владелец — берём первую.
  const locationId = auth.locationId ?? locations?.[0]?.id;

  const { data: orders, isLoading } = useStaffOrders(locationId);
  const transition = useStaffTransition(locationId);
  const qc = useQueryClient();
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    if (!locationId) return;
    subscribeLocation(locationId);
    const socket = getSocket();
    const onNew = () => {
      if (soundOn) haptic('warning');
      qc.invalidateQueries({ queryKey: ['staff', 'orders', locationId] });
    };
    const onUpd = () => qc.invalidateQueries({ queryKey: ['staff', 'orders', locationId] });
    socket.on(WsEvent.OrderCreated, onNew);
    socket.on(WsEvent.OrderUpdated, onUpd);
    return () => {
      socket.off(WsEvent.OrderCreated, onNew);
      socket.off(WsEvent.OrderUpdated, onUpd);
    };
  }, [locationId, qc, soundOn]);

  const sorted = useMemo(
    () => [...(orders ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders],
  );

  if (!locationId) return <div className="center">Точка не назначена</div>;
  if (isLoading) return <div className="center">Загрузка заказов…</div>;

  const act = (order: OrderResponse, event: OrderEvent) => {
    transition.mutate({ orderId: order.id, event });
  };

  return (
    <div className="app" data-scheme="dark">
      <div className="row between">
        <div className="h1">Заказы</div>
        <button className="btn secondary sm" onClick={() => setSoundOn((v) => !v)}>
          {soundOn ? '🔔' : '🔕'}
        </button>
      </div>

      {sorted.length === 0 && <div className="center">Активных заказов нет</div>}

      {sorted.map((o) => (
        <div key={o.id} className="card order-card">
          <div className="row between">
            <b style={{ fontSize: 18 }}>{o.number}</b>
            <span className="chip">{new Date(o.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {o.items.map((it, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              • {it.name}
              {it.quantity > 1 ? ` ×${it.quantity}` : ''}
              {it.options.length > 0 && (
                <span className="hint"> — {it.options.map((x) => x.optionName).join(', ')}</span>
              )}
            </div>
          ))}
          {o.comment && <div className="hint" style={{ marginTop: 4 }}>💬 {o.comment}</div>}
          <div className="row between" style={{ marginTop: 6 }}>
            <span className="hint">{formatMoney(o.total)}</span>
          </div>
          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            {actionsFor(o.status).map((a) => (
              <button
                key={a.event}
                className={`btn ${a.danger ? 'danger' : ''}`}
                style={{ flex: 1 }}
                disabled={transition.isPending}
                onClick={() => act(o, a.event)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
