import { Link } from 'react-router-dom';
import { formatMoney, OrderStatus } from '@coffee/shared';
import { useMyOrders } from '../../api/hooks';

const STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.Created]: 'Оформлен',
  [OrderStatus.PendingPayment]: 'Ждёт оплаты',
  [OrderStatus.Paid]: 'Оплачен',
  [OrderStatus.Accepted]: 'Принят',
  [OrderStatus.Preparing]: 'Готовится',
  [OrderStatus.Ready]: 'Готов',
  [OrderStatus.Completed]: 'Выдан',
  [OrderStatus.Rejected]: 'Отклонён',
  [OrderStatus.AutoCancelled]: 'Отменён',
  [OrderStatus.CancelledByClient]: 'Отменён вами',
};

const ACTIVE: OrderStatus[] = [
  OrderStatus.Created,
  OrderStatus.PendingPayment,
  OrderStatus.Paid,
  OrderStatus.Accepted,
  OrderStatus.Preparing,
  OrderStatus.Ready,
];

export function HistoryScreen() {
  const { data: orders, isLoading } = useMyOrders();

  if (isLoading) return <div className="center">Загрузка…</div>;
  if (!orders || orders.length === 0) {
    return (
      <div className="center">
        <div style={{ fontSize: 44, color: 'var(--color-neutral-400)' }}>☕</div>
        <div className="serif" style={{ fontSize: 22 }}>
          Заказов пока нет
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="kicker">История</div>
      <h2 className="h1" style={{ fontSize: 26, margin: '4px 0 14px' }}>
        Мои заказы
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orders.map((o) => {
          const active = ACTIVE.includes(o.status);
          return (
            <Link
              key={o.id}
              to={`/order/${o.id}`}
              className="card"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'var(--color-text)' }}
            >
              <span>
                <span className="serif" style={{ fontSize: 16, display: 'block' }}>
                  Заказ {o.number}
                </span>
                <span className="hint">
                  {new Date(o.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>
              <span style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                <span className="tnum serif" style={{ fontSize: 16 }}>
                  {formatMoney(o.total)}
                </span>
                <span className={`tag ${active ? 'tag-accent' : 'tag-neutral'}`}>
                  {STATUS_LABEL[o.status]}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
