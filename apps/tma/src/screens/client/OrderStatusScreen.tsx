import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { canTransition, formatMoney, OrderEvent, OrderStatus, WsEvent } from '@coffee/shared';
import { useCancelOrder, useOrder, usePayOrder } from '../../api/hooks';
import { getSocket, subscribeOrder } from '../../ws';
import { haptic, openPaymentPage } from '../../telegram';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: OrderStatus.Created, label: 'Оформлен' },
  { status: OrderStatus.Paid, label: 'Оплачен' },
  { status: OrderStatus.Accepted, label: 'Принят' },
  { status: OrderStatus.Preparing, label: 'Готовится' },
  { status: OrderStatus.Ready, label: 'Готов' },
  { status: OrderStatus.Completed, label: 'Выдан' },
];

const CANCELLED_TEXT: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.Rejected]: 'Заказ отклонён кофейней.',
  [OrderStatus.AutoCancelled]: 'Заказ отменён: он не был оплачен или кофейня не приняла его вовремя.',
  [OrderStatus.CancelledByClient]: 'Вы отменили заказ.',
};

export function OrderStatusScreen() {
  const { id } = useParams<{ id: string }>();
  const { data: order } = useOrder(id);
  const cancel = useCancelOrder(id);
  const pay = usePayOrder();
  const [payErr, setPayErr] = useState<string | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

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

  const awaitingPayment = order.status === OrderStatus.PendingPayment;
  const cancelledText = CANCELLED_TEXT[order.status];

  // Клиент мог закрыть страницу банка, не заплатив: даём вернуться к оплате.
  // Сервер отдаёт ту же ссылку, второй платёж не создаётся.
  const retryPayment = async () => {
    setPayErr(null);
    try {
      const result = await pay.mutateAsync({ orderId: order.id });
      if (result.confirmationUrl) openPaymentPage(result.confirmationUrl);
      else setPayErr('Платёж уже обработан — обновите экран через пару секунд.');
    } catch (e) {
      haptic('error');
      setPayErr(e instanceof Error ? e.message : 'Не удалось открыть оплату');
    }
  };

  if (awaitingPayment) {
    return (
      <div className="app">
        <div className="check-circle">₽</div>
        <h2 style={{ fontSize: 28, fontWeight: 400, textAlign: 'center', margin: '20px 0 4px' }}>
          Ждём оплату
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: 'rgba(32,31,29,.65)',
            fontStyle: 'italic',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Заказ {order.number} на {formatMoney(order.total)} зарезервирован. Кофейня начнёт
          готовить сразу после оплаты.
        </p>

        {payErr && (
          <div className="notice notice-danger" style={{ marginTop: 16 }}>
            {payErr}
          </div>
        )}

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 22 }}
          disabled={pay.isPending}
          onClick={retryPayment}
        >
          {pay.isPending ? 'Открываем оплату…' : 'Перейти к оплате'}
        </button>
        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 10 }}
          disabled={cancel.isPending}
          onClick={() => cancel.mutate(undefined, { onSuccess: () => haptic('warning') })}
        >
          {cancel.isPending ? 'Отменяем…' : 'Отменить заказ'}
        </button>
        <div className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
          Если оплата уже прошла, статус обновится сам в течение минуты.
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === order.status);
  const isReady = order.status === OrderStatus.Ready;
  const isDone = order.status === OrderStatus.Completed;
  const currentLabel = STEPS[currentIndex]?.label ?? '—';

  const readyAt = order.readyAtPromised
    ? new Date(order.readyAtPromised).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="app">
      {!cancelledText && (
        <div className="check-circle" style={isReady ? { animation: 'fade .4s ease' } : undefined}>
          {isReady || isDone ? '✓' : '☕'}
        </div>
      )}

      <h2 style={{ fontSize: 28, fontWeight: 400, textAlign: 'center', margin: '20px 0 4px' }}>
        {cancelledText ? 'Заказ отменён' : isReady ? 'Заказ готов' : 'Заказ принят'}
      </h2>
      <p
        style={{
          fontSize: 13.5,
          color: 'rgba(32,31,29,.65)',
          fontStyle: 'italic',
          textAlign: 'center',
          margin: 0,
        }}
      >
        {cancelledText ?? (isReady ? 'Без очереди — заходите и забирайте.' : 'Мы уведомим, когда будет готово.')}
      </p>

      {cancelledText ? (
        <div className="notice notice-danger" style={{ marginTop: 22 }}>
          {cancelledText}
        </div>
      ) : (
        <>
          <div className="steps" style={{ justifyContent: 'center' }}>
            {STEPS.map((s, i) => (
              <span key={s.status} className={`ob-dot ${i <= currentIndex ? 'on' : ''}`} />
            ))}
          </div>

          <div
            style={{
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-md)',
              padding: 18,
              marginTop: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingBottom: 12,
                borderBottom: '1px solid var(--color-divider)',
              }}
            >
              <div>
                <div className="kicker">Заказ</div>
                <div className="tnum serif" style={{ fontSize: 20 }}>
                  {order.number}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="kicker">{isReady || isDone ? 'Статус' : 'Готовность'}</div>
                <div className="tnum serif" style={{ fontSize: 20 }}>
                  {isReady || isDone ? currentLabel : readyAt ? `к ${readyAt}` : currentLabel}
                </div>
              </div>
            </div>
            <div style={{ paddingTop: 12, fontSize: 13, color: 'rgba(32,31,29,.72)', lineHeight: 1.6 }}>
              Покажите этот экран на кассе при получении.
            </div>
          </div>

          {isReady && (
            <div className="notice notice-success" style={{ marginTop: 12, textAlign: 'center' }}>
              ☕ Готово! Можно забирать.
            </div>
          )}
        </>
      )}

      <h2 className="h2">Состав</h2>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {order.items.map((it, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 0',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            <div>
              <div className="serif" style={{ fontSize: 15 }}>
                {it.name}
                {it.quantity > 1 ? ` ×${it.quantity}` : ''}
              </div>
              {it.options.length > 0 && (
                <div style={{ fontSize: 11.5, color: 'rgba(32,31,29,.6)' }}>
                  {it.options.map((o) => o.optionName).join(' · ')}
                </div>
              )}
            </div>
            <span className="tnum">{formatMoney(it.lineTotal)}</span>
          </div>
        ))}
      </div>
      <div className="row between serif" style={{ marginTop: 14, fontSize: 18 }}>
        <span>Итого</span>
        <span className="tnum">{formatMoney(order.total)}</span>
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} onClick={() => navigate('/menu')}>
        Вернуться в меню
      </button>

      {canTransition(order.status, OrderEvent.CancelByClient) && (
        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 10 }}
          disabled={cancel.isPending}
          onClick={() => {
            cancel.mutate(undefined, { onSuccess: () => haptic('warning') });
          }}
        >
          {cancel.isPending ? 'Отменяем…' : 'Отменить заказ'}
        </button>
      )}
    </div>
  );
}
