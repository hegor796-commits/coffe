import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, type CreateOrderDto } from '@coffee/shared';
import { useCart } from '../../store/cart';
import { useCreateOrder, usePayOrder } from '../../api/hooks';
import { haptic, openPaymentPage } from '../../telegram';
import { ApiError } from '../../api/client';
import { useAuth } from '../../store/auth';

const EMAIL_KEY = 'coffee_receipt_email';

export function CartScreen({ locationId }: { locationId: string }) {
  const { lines, changeQty, clear, total } = useCart();
  const [comment, setComment] = useState('');
  const createOrder = useCreateOrder();
  const payOrder = usePayOrder();
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const isOnline = useAuth((s) => s.tenant?.paymentMode) === 'online';
  // Почту для чека спрашиваем один раз и запоминаем: Telegram её не отдаёт.
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) ?? '');
  const busy = createOrder.isPending || payOrder.isPending;

  if (lines.length === 0) {
    return (
      <div className="center">
        <div style={{ fontSize: 50, color: 'var(--color-neutral-400)' }}>☕</div>
        <div className="serif" style={{ fontSize: 22 }}>
          Заказ пуст
        </div>
        <p className="hint" style={{ fontStyle: 'italic', maxWidth: 240 }}>
          Добавьте что-нибудь из меню, чтобы забрать без очереди.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/menu')}>
          Открыть меню
        </button>
      </div>
    );
  }

  const submit = async () => {
    setErr(null);
    const dto: CreateOrderDto = {
      locationId,
      channel: 'tma' as CreateOrderDto['channel'],
      comment: comment || undefined,
      items: lines.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        options: l.options.map((o) => ({ groupId: o.groupId, optionId: o.optionId })),
      })),
    };
    if (isOnline && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErr('Укажите email — на него придёт чек об оплате');
      return;
    }

    try {
      const order = await createOrder.mutateAsync(dto);
      clear();
      haptic('success');

      if (!isOnline) {
        navigate(`/order/${order.id}`);
        return;
      }

      localStorage.setItem(EMAIL_KEY, email.trim());
      // Заказ создан в статусе «ждёт оплаты». Экран заказа открываем сразу,
      // чтобы клиент вернулся на него из браузера и увидел итог оплаты.
      const payment = await payOrder.mutateAsync({ orderId: order.id, email: email.trim() });
      navigate(`/order/${order.id}`);
      if (payment.confirmationUrl) openPaymentPage(payment.confirmationUrl);
    } catch (e) {
      haptic('error');
      setErr(e instanceof ApiError ? e.message : 'Не удалось оформить заказ');
    }
  };

  return (
    <div className="app">
      <div className="kicker">{isOnline ? 'Оплата онлайн' : 'Забрать на кассе'}</div>
      <h2 className="h1" style={{ fontSize: 26, margin: '4px 0 10px' }}>
        Ваш заказ
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lines.map((l) => (
          <div
            key={l.key}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              padding: '14px 0',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 16 }}>
                {l.product.name}
              </div>
              {l.options.length > 0 && (
                <div style={{ fontSize: 11.5, color: 'rgba(32,31,29,.6)' }}>
                  {l.options.map((o) => o.optionName).join(' · ')}
                </div>
              )}
              <span
                className="tnum"
                style={{
                  fontSize: 12.5,
                  color: 'var(--color-accent-700)',
                  display: 'inline-block',
                  marginTop: 3,
                }}
              >
                {formatMoney(l.unitPrice * l.quantity)}
              </span>
            </div>
            <div className="stp">
              <button className="stpb" onClick={() => changeQty(l.key, -1)}>
                −
              </button>
              <span className="q">{l.quantity}</span>
              <button className="stpb" onClick={() => changeQty(l.key, +1)}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {isOnline && (
        <div className="field-box" style={{ marginTop: 16 }}>
          <input
            className="textin"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email для чека"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      )}

      <div className="field-box" style={{ marginTop: 16, alignItems: 'flex-start' }}>
        <textarea
          className="textin"
          rows={2}
          placeholder="Комментарий к заказу (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="row between" style={{ fontSize: 13, color: 'rgba(32,31,29,.7)' }}>
          <span>Позиций</span>
          <span className="tnum">{lines.reduce((s, l) => s + l.quantity, 0)}</span>
        </div>
        <hr className="hr" style={{ margin: '6px 0' }} />
        <div className="row between serif" style={{ fontSize: 18 }}>
          <span>Итого</span>
          <span className="tnum">{formatMoney(total())}</span>
        </div>
      </div>

      {err && (
        <div className="notice notice-danger" style={{ marginTop: 12 }}>
          {err}
        </div>
      )}

      <div className="sticky-bottom">
        <div className="sticky-inner">
          <button className="mainbtn" disabled={busy} onClick={submit}>
            <span>{busy ? 'Оформляем…' : isOnline ? 'Оплатить' : 'Заказать'}</span>
            <span className="tnum">{formatMoney(total())}</span>
          </button>
          <div className="hint" style={{ textAlign: 'center', marginTop: 6 }}>
            {isOnline ? 'Оплата картой или СБП, чек придёт на почту' : 'Оплата при получении на кассе'}
          </div>
        </div>
      </div>
    </div>
  );
}
