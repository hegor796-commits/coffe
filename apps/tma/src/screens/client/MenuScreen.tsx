import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@coffee/shared';
import { useMenu } from '../../api/hooks';
import type { MenuProduct } from '../../api/types';
import { ProductSheet } from './ProductSheet';
import { useCart } from '../../store/cart';
import { haptic } from '../../telegram';
import { productGlyph } from './glyph';
import { defaultVariant } from './variant';

export function MenuScreen({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useMenu(locationId);
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState('');

  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const changeQty = useCart((s) => s.changeQty);
  const count = useCart((s) => s.count());
  const total = useCart((s) => s.total());
  const navigate = useNavigate();

  const visible = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const cats = data.categories.filter((c) => category === 'all' || c.id === category);
    const items: { catName: string; product: MenuProduct }[] = [];
    for (const c of cats) {
      for (const p of c.products) {
        if (q && !`${p.name} ${p.description ?? ''}`.toLowerCase().includes(q)) continue;
        items.push({ catName: c.name, product: p });
      }
    }
    return items;
  }, [data, category, query]);

  if (isLoading) return <div className="center">Загрузка меню…</div>;
  if (error) return <div className="center">Не удалось загрузить меню</div>;
  if (!data) return null;

  const qtyOf = (p: MenuProduct) => {
    const v = defaultVariant(p);
    return lines.find((l) => l.key === v.key)?.quantity ?? 0;
  };

  const quickAdd = (p: MenuProduct) => {
    const v = defaultVariant(p);
    if (!v.valid) {
      // Обязательный выбор без дефолта — открываем карточку.
      setSelected(p);
      return;
    }
    add({ product: p, quantity: 1, options: v.options, unitPrice: v.unitPrice });
    haptic('success');
  };

  return (
    <div className="app">
      <div className="kicker">Без очереди</div>
      <h3 className="h1" style={{ fontSize: 26, margin: '2px 0 12px' }}>
        {data.location.name}
      </h3>

      {!data.location.isAcceptingOrders && (
        <div className="notice notice-danger" style={{ marginBottom: 12 }}>
          Точка сейчас не принимает предзаказы.
        </div>
      )}

      <div className="field-box" style={{ marginBottom: 14 }}>
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-neutral-500)"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
        <input
          className="schin"
          placeholder="Поиск по меню…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="chips-scroll" style={{ marginBottom: 16 }}>
        <span className={`chip ${category === 'all' ? 'on' : ''}`} onClick={() => setCategory('all')}>
          Всё
        </span>
        {data.categories.map((c) => (
          <span
            key={c.id}
            className={`chip ${category === c.id ? 'on' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.name}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map(({ product: p }) => {
          const qty = qtyOf(p);
          const v = defaultVariant(p);
          return (
            <div
              key={p.id}
              className="card"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: 12,
                cursor: 'pointer',
                opacity: p.available ? 1 : 0.5,
              }}
              onClick={() => p.available && setSelected(p)}
            >
              <div className="plate" style={{ borderRadius: 'var(--radius-sm)', borderWidth: 4 }}>
                <div className="plc" style={{ width: 66, height: 66, fontSize: 24 }}>
                  {productGlyph(p.name)}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="card-title" style={{ fontSize: 16 }}>
                  {p.name}
                </div>
                {p.description && (
                  <p className="card-body" style={{ fontSize: 12, margin: '2px 0 0' }}>
                    {p.description}
                  </p>
                )}
                <span
                  className="tnum serif"
                  style={{ fontSize: 14, display: 'inline-block', marginTop: 5 }}
                >
                  {formatMoney(p.basePrice)}
                </span>
                {!p.available && <div className="hint">нет в наличии</div>}
              </div>

              {p.available &&
                (qty > 0 && v.valid ? (
                  <div className="stp" onClick={(e) => e.stopPropagation()}>
                    <button className="stpb" onClick={() => changeQty(v.key, -1)}>
                      −
                    </button>
                    <span className="q">{qty}</span>
                    <button className="stpb" onClick={() => changeQty(v.key, +1)}>
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    className="addb"
                    onClick={(e) => {
                      e.stopPropagation();
                      quickAdd(p);
                    }}
                  >
                    +
                  </button>
                ))}
            </div>
          );
        })}
        {visible.length === 0 && (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--color-neutral-600)',
              fontStyle: 'italic',
              padding: '20px 0',
            }}
          >
            Ничего не нашлось.
          </p>
        )}
      </div>

      {selected && <ProductSheet product={selected} onClose={() => setSelected(null)} />}

      {count > 0 && (
        <div className="sticky-bottom">
          <div className="sticky-inner">
            <button className="mainbtn" onClick={() => navigate('/cart')}>
              <span>Корзина · {count}</span>
              <span className="tnum">{formatMoney(total)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
