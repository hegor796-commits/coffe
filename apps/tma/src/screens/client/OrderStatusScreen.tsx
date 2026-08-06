import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatMoney, OrderStatus, WsEvent } from '@coffee/shared';
import { useOrder } from '../../api/hooks';
import { getSocket, subscribeOrder } from '../../ws';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: OrderStatus.Created, label: 'Оформлен' },
  { status: OrderStatus.Accepted, label: 'Принят' },
  { status: OrderStatus.Preparing, label: 'Готовится' },
  { status: OrderStatus.Ready, label: 'Готов' },
  { status: OrderStatus.Completed, label: 'Выдан' },
];

const CANCELLED_TEXT: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.Rejected]: 'Заказ отклонён кофейней.',
  [OrderStatus.AutoCancelled]: 'Заказ отменён: кофейня не приняла его вовремя.',
  [OrderStatus.CancelledByClient]: 'Вы отменили заказ.',
};

export function OrderStatusScreen() {
  const { id } = useParams<{ id: string }>();
  const { data: order } = useOrder(id);
  const qc = useQueryClient();

  useEffect(() => {
    if (!id) return;
    subscribeOrder(id);
    const socket = getSocket();
    const handler = () => qc.invalidateQueries({ queryKey: ['order', id] });
    socket.on(WsEvent.OrderUpdated, handler);
    return () => {
      socket.off(WsEvent.OrderUpdated, handler);
    };
  }, [id, qc]);

  if (!order) return <div className="center">Загрузка заказа…</div>;

  const cancelledText = CANCELLED_TEXT[order.status];
  const currentIndex = STEPS.findIndex((s) => s.status === order.status);
  const progress = cancelledText ? 0 : ((currentIndex + 1) / STEPS.length) * 100;

  const readyAt = order.readyAtPromised
    ? new Date(order.readyAtPromised).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="app">
      <div className="h1">Заказ {order.number}</div>

      {cancelledText ? (
        <div className="card" style={{ background: 'rgba(229,72,77,0.12)' }}>{cancelledText}</div>
      ) : (
        <>
          <div className="stepper">
            <div style={{ width: `${progress}%` }} />
          </div>
          <div className="row between">
            {STEPS.map((s, i) => (
              <span key={s.status} className={i <= currentIndex ? '' : 'muted'} style={{ fontSize: 12 }}>
                {s.label}
              </span>
            ))}
          </div>
          {readyAt && order.status !== OrderStatus.Completed && (
            <div className="card" style={{ marginTop: 14, textAlign: 'center' }}>
              Готовность к <b>{readyAt}</b>
            </div>
          )}
          {order.status === OrderStatus.Ready && (
            <div className="card" style={{ background: 'rgba(48,163,108,0.15)', textAlign: 'center' }}>
              ☕️ Готово! Можно забирать.
            </div>
          )}
        </>
      )}

      <div className="h2">Состав</div>
      {order.items.map((it, i) => (
        <div key={i} className="card">
          <div className="row between">
            <b>
              {it.name}
              {it.quantity > 1 ? ` ×${it.quantity}` : ''}
            </b>
            <span>{formatMoney(it.lineTotal)}</span>
          </div>
          {it.options.length > 0 && (
            <div className="hint">{it.options.map((o) => o.optionName).join(', ')}</div>
          )}
        </div>
      ))}
      <div className="row between" style={{ marginTop: 8, fontWeight: 700 }}>
        <span>Итого</span>
        <span>{formatMoney(order.total)}</span>
      </div>
    </div>
  );
}
