import { useState } from 'react';
import { formatMoney } from '@coffee/shared';
import { useMenu } from '../../api/hooks';
import type { MenuProduct } from '../../api/types';
import { ProductSheet } from './ProductSheet';
import { useCart } from '../../store/cart';
import { Link } from 'react-router-dom';

export function MenuScreen({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useMenu(locationId);
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const count = useCart((s) => s.count());
  const total = useCart((s) => s.total());

  if (isLoading) return <div className="center">Загрузка меню…</div>;
  if (error) return <div className="center">Не удалось загрузить меню</div>;
  if (!data) return null;

  return (
    <div className="app">
      <div className="h1">{data.location.name}</div>
      {!data.location.isAcceptingOrders && (
        <div className="card" style={{ background: 'rgba(229,72,77,0.12)' }}>
          Точка сейчас не принимает предзаказы.
        </div>
      )}

      {data.categories.map((cat) => (
        <div key={cat.id}>
          <div className="h2">{cat.name}</div>
          {cat.products.map((p) => (
            <button
              key={p.id}
              className="card row between"
              style={{ width: '100%', textAlign: 'left', opacity: p.available ? 1 : 0.5 }}
              disabled={!p.available}
              onClick={() => setSelected(p)}
            >
              <span>
                <b>{p.name}</b>
                {p.description && <div className="hint">{p.description}</div>}
                {!p.available && <div className="hint">нет в наличии</div>}
              </span>
              <span className="chip">{formatMoney(p.basePrice)}</span>
            </button>
          ))}
        </div>
      ))}

      {selected && <ProductSheet product={selected} onClose={() => setSelected(null)} />}

      {count > 0 && (
        <div className="sticky-bottom">
          <div className="sticky-inner">
            <Link to="/cart" className="btn block row between" style={{ textDecoration: 'none' }}>
              <span>Корзина · {count}</span>
              <span>{formatMoney(total)}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
