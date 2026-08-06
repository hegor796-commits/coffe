import { useAdminLocations, useMenu, useToggleStop } from '../../api/hooks';
import { useState } from 'react';

export function StopListTab() {
  const { data: locations } = useAdminLocations();
  const [locationId, setLocationId] = useState<string>('');
  const current = locationId || locations?.[0]?.id;
  const { data: menu } = useMenu(current);
  const toggle = useToggleStop(current);

  return (
    <>
      <div className="h2">Стоп-лист</div>
      <select
        className="card"
        value={current ?? ''}
        onChange={(e) => setLocationId(e.target.value)}
        style={{ width: '100%' }}
      >
        {locations?.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      <div className="hint" style={{ marginBottom: 8 }}>
        Выключите то, что закончилось — оно скроется из меню гостей.
      </div>

      {menu?.categories.map((cat) =>
        cat.products.map((p) => (
          <div key={p.id} className="card row between">
            <span style={{ opacity: p.available ? 1 : 0.5 }}>{p.name}</span>
            <button
              className={`btn sm ${p.available ? 'secondary' : 'danger'}`}
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ productId: p.id, stopped: p.available })}
            >
              {p.available ? 'В наличии' : 'Стоп'}
            </button>
          </div>
        )),
      )}
    </>
  );
}
