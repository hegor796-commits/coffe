import { useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useLocations } from '../../api/hooks';
import { MenuScreen } from './MenuScreen';
import { CartScreen } from './CartScreen';
import { OrderStatusScreen } from './OrderStatusScreen';
import { HistoryScreen } from './HistoryScreen';

export function ClientApp() {
  const { data: locations, isLoading, error, refetch } = useLocations();
  const [locationId, setLocationId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (isLoading) return <div className="center">Загрузка точек…</div>;
  // Ошибку запроса не выдаём за «нет точек» — показываем причину и даём повтор.
  if (error) {
    return (
      <div className="center">
        <div className="serif" style={{ fontSize: 22 }}>
          Не удалось загрузить точки
        </div>
        <div className="hint">{(error as Error).message}</div>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => refetch()}>
          Повторить
        </button>
      </div>
    );
  }
  if (!locations || locations.length === 0) {
    return (
      <div className="center">
        <div style={{ fontSize: 44, color: 'var(--color-neutral-400)' }}>☕</div>
        <div className="serif" style={{ fontSize: 22 }}>
          Пока нет активных точек
        </div>
      </div>
    );
  }

  // Автовыбор единственной точки; иначе — выбор.
  const current = locationId ?? (locations.length === 1 ? locations[0].id : null);

  if (!current) {
    return (
      <div className="app">
        <div className="kicker">Кофейня</div>
        <div className="h1">Выберите точку</div>
        {locations.map((l) => (
          <button key={l.id} className="loc" onClick={() => setLocationId(l.id)}>
            <span className="radio-dot" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="serif" style={{ fontSize: 16, display: 'block' }}>
                {l.name}
              </span>
              <span className="hint">{l.address}</span>
            </span>
            {!l.isAcceptingOrders && <span className="tag tag-neutral">закрыто</span>}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      {locations.length > 1 && (
        <button
          className="btn btn-ghost"
          style={{ position: 'fixed', top: 6, right: 6, zIndex: 30, fontSize: 12 }}
          onClick={() => {
            setLocationId(null);
            navigate('/menu');
          }}
        >
          Сменить точку
        </button>
      )}
      <Routes>
        <Route path="menu" element={<MenuScreen locationId={current} />} />
        <Route path="cart" element={<CartScreen locationId={current} />} />
        <Route path="order/:id" element={<OrderStatusScreen />} />
        <Route path="history" element={<HistoryScreen />} />
        <Route path="*" element={<MenuScreen locationId={current} />} />
      </Routes>
      <nav className="tabbar">
        <NavLink to="/menu" className={({ isActive }) => (isActive ? 'active' : '')}>
          Меню
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : '')}>
          Корзина
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : '')}>
          Заказы
        </NavLink>
      </nav>
    </>
  );
}
