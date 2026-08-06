import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, type CreateOrderDto } from '@coffee/shared';
import { useCart } from '../../store/cart';
import { useCreateOrder } from '../../api/hooks';
import { haptic } from '../../telegram';
import { ApiError } from '../../api/client';

export function CartScreen({ locationId }: { locationId: string }) {
  const { lines, changeQty, clear, total } = useCart();
  const [comment, setComment] = useState('');
  const createOrder = useCreateOrder();
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  if (lines.length === 0) {
    return <div className="center">Корзина пуста</div>;
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
    try {
      const order = await createOrder.mutateAsync(dto);
      clear();
      haptic('success');
      navigate(`/order/${order.id}`);
    } catch (e) {
      haptic('error');
      setErr(e instanceof ApiError ? e.message : 'Не удалось оформить заказ');
    }
  };

  return (
    <div className="app">
      <div className="h1">Корзина</div>
      {lines.map((l) => (
        <div key={l.key} className="card">
          <div className="row between">
            <b>{l.product.name}</b>
            <span>{formatMoney(l.unitPrice * l.quantity)}</span>
          </div>
          {l.options.length > 0 && (
            <div className="hint">{l.options.map((o) => o.optionName).join(', ')}</div>
          )}
          <div className="qty" style={{ marginTop: 8 }}>
            <button onClick={() => changeQty(l.key, -1)}>−</button>
            <span>{l.quantity}</span>
            <button onClick={() => changeQty(l.key, +1)}>+</button>
          </div>
        </div>
      ))}

      <textarea
        className="card"
        style={{ width: '100%', border: 'none', resize: 'none', color: 'var(--text)' }}
        rows={2}
        placeholder="Комментарий к заказу (необязательно)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {err && <div className="card" style={{ background: 'rgba(229,72,77,0.12)' }}>{err}</div>}

      <div className="sticky-bottom">
        <div className="sticky-inner">
          <button className="btn block row between" disabled={createOrder.isPending} onClick={submit}>
            <span>{createOrder.isPending ? 'Оформляем…' : 'Заказать'}</span>
            <span>{formatMoney(total())}</span>
          </button>
          <div className="hint" style={{ textAlign: 'center', marginTop: 6 }}>
            Оплата при получении на кассе
          </div>
        </div>
      </div>
    </div>
  );
}
