import { useMemo, useState } from 'react';
import { formatMoney } from '@coffee/shared';
import type { MenuModifierGroup, MenuProduct } from '../../api/types';
import { useCart } from '../../store/cart';
import { haptic } from '../../telegram';
import { productGlyph } from './glyph';

/** Модальный лист выбора модификаторов и добавления в корзину. */
export function ProductSheet({ product, onClose }: { product: MenuProduct; onClose: () => void }) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);

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
        if (group.maxSelect === 1 && group.isRequired) return prev; // нельзя снять единственный обязательный
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
    const opts: { groupId: string; optionId: string; optionName: string; priceDelta: number }[] = [];
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
    add({ product, quantity: qty, options, unitPrice });
    haptic('success');
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="app" style={{ paddingTop: 16, paddingBottom: 108 }}>
          <div className="plate" style={{ borderRadius: 'var(--radius-md)' }}>
            <div className="plc" style={{ height: 180, fontSize: 60 }}>
              {productGlyph(product.name)}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 10,
              marginTop: 16,
            }}
          >
            <h2 style={{ fontSize: 26, fontWeight: 400, margin: 0 }}>{product.name}</h2>
            <span className="tnum serif" style={{ fontSize: 20 }}>
              {formatMoney(product.basePrice)}
            </span>
          </div>
          {product.description && (
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.6,
                color: 'rgba(32,31,29,.72)',
                margin: '8px 0 0',
                fontStyle: 'italic',
              }}
            >
              {product.description}
            </p>
          )}

          {product.modifierGroups.map((g) => {
            const single = g.maxSelect === 1;
            return (
              <div key={g.id}>
                <hr className="hr" style={{ margin: '20px 0' }} />
                <div className="serif" style={{ fontSize: 15, marginBottom: 10 }}>
                  {g.name}
                  {g.isRequired && <span className="hint"> · обязательно</span>}
                </div>
                <div className="chips-wrap">
                  {g.options.map((o) => {
                    const checked = selected[g.id]?.has(o.id);
                    return (
                      <span
                        key={o.id}
                        className={`chip ${checked ? 'on' : ''}`}
                        style={{ opacity: o.available ? 1 : 0.4, pointerEvents: o.available ? 'auto' : 'none' }}
                        onClick={() => o.available && toggle(g, o.id)}
                      >
                        {!single && <span style={{ marginRight: 6 }}>{checked ? '☑' : '☐'}</span>}
                        {o.name}
                        {o.priceDelta ? (
                          <span className="tnum" style={{ marginLeft: 6, opacity: 0.75 }}>
                            +{formatMoney(o.priceDelta)}
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <hr className="hr" style={{ margin: '20px 0' }} />
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div className="serif" style={{ fontSize: 15 }}>
              Количество
            </div>
            <div className="stp">
              <button className="stpb" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span className="q" style={{ fontSize: 16 }}>
                {qty}
              </span>
              <button className="stpb" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
          </div>
        </div>

        <div className="sticky-bottom" style={{ position: 'sticky' }}>
          <div className="sticky-inner">
            <button className="mainbtn" disabled={!valid} onClick={addToCart}>
              <span>Добавить</span>
              <span className="tnum">{formatMoney(unitPrice * qty)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
