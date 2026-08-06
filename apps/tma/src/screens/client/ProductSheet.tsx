import { useMemo, useState } from 'react';
import { formatMoney } from '@coffee/shared';
import type { MenuModifierGroup, MenuProduct } from '../../api/types';
import { useCart } from '../../store/cart';
import { haptic } from '../../telegram';

/** Модальное окно выбора модификаторов и добавления в корзину. */
export function ProductSheet({ product, onClose }: { product: MenuProduct; onClose: () => void }) {
  const add = useCart((s) => s.add);
  // Предвыбор дефолтных опций.
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    for (const g of product.modifierGroups) {
      const defaults = g.options.filter((o) => o.isDefault && o.available).map((o) => o.id);
      init[g.id] = new Set(defaults.slice(0, g.maxSelect));
    }
    return init;
  });

  const toggle = (group: MenuModifierGroup, optionId: string) => {
    setSelected((prev) => {
      const cur = new Set(prev[group.id]);
      if (cur.has(optionId)) {
        cur.delete(optionId);
      } else {
        if (group.maxSelect === 1) cur.clear();
        if (cur.size >= group.maxSelect) return prev;
        cur.add(optionId);
      }
      return { ...prev, [group.id]: cur };
    });
  };

  const { unitPrice, valid, options } = useMemo(() => {
    let price = product.basePrice;
    const opts: {
      groupId: string;
      optionId: string;
      optionName: string;
      priceDelta: number;
    }[] = [];
    let ok = true;
    for (const g of product.modifierGroups) {
      const chosen = selected[g.id] ?? new Set();
      if (g.isRequired && chosen.size < Math.max(1, g.minSelect)) ok = false;
      if (chosen.size < g.minSelect) ok = false;
      for (const oid of chosen) {
        const o = g.options.find((x) => x.id === oid);
        if (o) {
          price += o.priceDelta;
          opts.push({ groupId: g.id, optionId: o.id, optionName: o.name, priceDelta: o.priceDelta });
        }
      }
    }
    return { unitPrice: price, valid: ok, options: opts };
  }, [product, selected]);

  const addToCart = () => {
    add({ product, quantity: 1, options, unitPrice });
    haptic('success');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="app"
        style={{ background: 'var(--bg)', borderRadius: '18px 18px 0 0', width: '100%', maxHeight: '85vh', overflowY: 'auto', paddingBottom: 100 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h1">{product.name}</div>
        {product.description && <div className="hint">{product.description}</div>}

        {product.modifierGroups.map((g) => (
          <div key={g.id}>
            <div className="h2">
              {g.name}
              {g.isRequired && <span className="hint"> · обязательно</span>}
            </div>
            {g.options.map((o) => {
              const checked = selected[g.id]?.has(o.id);
              return (
                <div
                  key={o.id}
                  className="opt"
                  style={{ opacity: o.available ? 1 : 0.4 }}
                  onClick={() => o.available && toggle(g, o.id)}
                >
                  <span>
                    {g.maxSelect === 1 ? (checked ? '◉' : '○') : checked ? '☑' : '☐'} {o.name}
                  </span>
                  <span className="hint">{o.priceDelta ? `+${formatMoney(o.priceDelta)}` : ''}</span>
                </div>
              );
            })}
          </div>
        ))}

        <div className="sticky-bottom">
          <div className="sticky-inner">
            <button className="btn block" disabled={!valid} onClick={addToCart}>
              Добавить · {formatMoney(unitPrice)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
