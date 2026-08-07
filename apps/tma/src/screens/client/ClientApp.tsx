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
        <div>Не удалось загрузить точки.</div>
        <div className="hint">{(error as Error).message}</div>
        <button className="card" style={{ marginTop: 12 }} onClick={() => refetch()}>
          Повторить
        </button>
      </div>
    );
  }
  if (!locations || locations.length === 0) {
    return <div className="center">У этой кофейни пока нет активных точек.</div>;
  }

  // Автовыбор единственной точки; иначе — выбор.
  const current = locationId ?? (locations.length === 1 ? locations[0].id : null);

  if (!current) {
    return (
      <div className="app">
        <div className="h1">Выберите точку</div>
        {locations.map((l) => (
          <button
            key={l.id}
            className="card row between"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={() => setLocationId(l.id)}
          >
            <span>
              <b>{l.name}</b>
              <div className="hint">{l.address}</div>
            </span>
            {!l.isAcceptingOrders && <span className="chip">закрыто</span>}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
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
      {locations.length > 1 && (
        <button
          className="btn secondary sm"
          style={{ position: 'fixed', top: 8, right: 8 }}
          onClick={() => {
            setLocationId(null);
            navigate('/menu');
          }}
        >
          Сменить точку
        </button>
      )}
    </>
  );
}
