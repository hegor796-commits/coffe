import { NavLink, Route, Routes } from 'react-router-dom';
import { useLocations } from '../../api/hooks';
import { MenuScreen } from './MenuScreen';
import { CartScreen } from './CartScreen';
import { OrderStatusScreen } from './OrderStatusScreen';
import { HistoryScreen } from './HistoryScreen';

export function ClientApp() {
  const { data: locations, isLoading, error, refetch } = useLocations();

  if (isLoading) return <div className="center">Загрузка…</div>;
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

  // Одна точка на кофейню — выбор не показываем, берём первую.
  const current = locations[0].id;

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
    </>
  );
}
