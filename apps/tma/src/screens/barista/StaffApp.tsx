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

const STATUS_TAG: Partial<Record<OrderStatus, { label: string; cls: string }>> = {
  [OrderStatus.Created]: { label: 'новый', cls: 'tag-accent' },
  [OrderStatus.Accepted]: { label: 'принят', cls: 'tag-neutral' },
  [OrderStatus.Preparing]: { label: 'готовится', cls: 'tag-neutral' },
  [OrderStatus.Ready]: { label: 'готов', cls: 'tag-outline' },
};

function ageLabel(createdAt: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const h = Math.floor(mins / 60);
  return `${h} ч назад`;
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
    <div className="app">
      <div className="row between" style={{ marginBottom: 6 }}>
        <div>
          <div className="kicker">Лента заказов</div>
          <h2 className="h1" style={{ fontSize: 26, margin: '2px 0 0' }}>
            Бариста
          </h2>
        </div>
        <button
          className="btn btn-secondary"
          style={{ padding: '8px 12px' }}
          onClick={() => setSoundOn((v) => !v)}
          title="Отклик на новые заказы"
        >
          {soundOn ? '🔔' : '🔕'}
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="center" style={{ minHeight: '50vh' }}>
          <div style={{ fontSize: 40, color: 'var(--color-neutral-400)' }}>☕</div>
          <div className="serif" style={{ fontSize: 20 }}>
            Активных заказов нет
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {sorted.map((o) => {
          const tag = STATUS_TAG[o.status];
          const isNew = o.status === OrderStatus.Created;
          const isReady = o.status === OrderStatus.Ready;
          return (
            <div
              key={o.id}
              className="card"
              style={{
                gap: 8,
                borderColor: isNew
                  ? 'var(--color-accent)'
                  : isReady
                    ? 'color-mix(in srgb, var(--color-success) 55%, var(--color-divider))'
                    : 'var(--color-divider)',
                background: isNew ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)' : 'transparent',
              }}
            >
              <div className="row between">
                <span className="tnum serif" style={{ fontSize: 20 }}>
                  {o.number}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  {tag && <span className={`tag ${tag.cls}`}>{tag.label}</span>}
                  <span className="hint tnum">{ageLabel(o.createdAt)}</span>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {o.items.map((it, i) => (
                  <div key={i} style={{ fontSize: 14 }}>
                    <span className="serif">
                      {it.name}
                      {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                    </span>
                    {it.options.length > 0 && (
                      <span className="hint"> — {it.options.map((x) => x.optionName).join(', ')}</span>
                    )}
                  </div>
                ))}
              </div>

              {o.comment && (
                <div className="hint" style={{ fontStyle: 'italic' }}>
                  💬 {o.comment}
                </div>
              )}

              <div className="row between" style={{ marginTop: 2 }}>
                <span className="tnum" style={{ color: 'var(--color-accent-700)' }}>
                  {formatMoney(o.total)}
                </span>
              </div>

              <div className="row" style={{ marginTop: 6, gap: 8 }}>
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
          );
        })}
      </div>
    </div>
  );
}
