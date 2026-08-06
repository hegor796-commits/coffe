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

export function HistoryScreen() {
  const { data: orders, isLoading } = useMyOrders();

  if (isLoading) return <div className="center">Загрузка…</div>;
  if (!orders || orders.length === 0) return <div className="center">Заказов пока нет</div>;

  return (
    <div className="app">
      <div className="h1">Мои заказы</div>
      {orders.map((o) => (
        <Link
          key={o.id}
          to={`/order/${o.id}`}
          className="card order-card row between"
          style={{ textDecoration: 'none', color: 'var(--text)' }}
        >
          <span>
            <b>Заказ {o.number}</b>
            <div className="hint">
              {new Date(o.createdAt).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </span>
          <span style={{ textAlign: 'right' }}>
            <div>{formatMoney(o.total)}</div>
            <span className="badge" style={{ background: 'var(--secondary-bg)' }}>
              {STATUS_LABEL[o.status]}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
