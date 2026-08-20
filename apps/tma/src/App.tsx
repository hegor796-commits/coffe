import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Role } from '@coffee/shared';
import { api } from './api/client';
import { useAuth } from './store/auth';
import { getInitData, getStartParam } from './telegram';
import { applyTheme } from './theme';
import { ClientApp } from './screens/client/ClientApp';
import { StaffApp } from './screens/barista/StaffApp';
import { AdminApp } from './screens/admin/AdminApp';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: Role;
  locationId?: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    branding: { primaryColor?: string; logoUrl?: string | null };
    paymentMode: string;
  };
}

export function App() {
  const { accessToken, role, tenant, setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deepLinkOrderId, setDeepLinkOrderId] = useState<string | null>(null);
  const booted = useRef(false);

  useEffect(() => {
    // Логинимся один раз на маунт. В Telegram — ВСЕГДА заново (свежий initData),
    // не полагаясь на сохранённый токен: он мог протухнуть (TTL) или быть
    // подписан прежним секретом инстанса. Это убирает залипание на 401.
    if (booted.current) return;
    booted.current = true;

    const initData = getInitData();
    // start_param используется и как slug кофейни, и как возврат с оплаты
    // (order_<id>) — ЮKassa приводит клиента по этой ссылке. Различаем по префиксу.
    const startParam = getStartParam();
    const returningToOrder = startParam?.startsWith('order_') ? startParam.slice(6) : null;
    if (returningToOrder) setDeepLinkOrderId(returningToOrder);
    const tenantSlug = returningToOrder
      ? undefined
      : startParam ?? new URLSearchParams(location.search).get('tenant') ?? undefined;

    if (!initData) {
      // Dev-браузер без Telegram: используем сохранённый токен, если он есть.
      if (accessToken) {
        applyTheme(tenant?.branding?.primaryColor);
        setLoading(false);
        return;
      }
      setLoading(false);
      setError('Откройте приложение через Telegram (initData отсутствует).');
      return;
    }

    api<LoginResponse>('/v1/auth/telegram', {
      method: 'POST',
      auth: false,
      body: { initData, tenantSlug },
    })
      .then((res) => {
        setAuth(res);
        applyTheme(res.tenant.branding?.primaryColor);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // Намеренно один раз на маунт — зависимости не отслеживаем.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="center">Загрузка…</div>;
  if (error) return <div className="center">{error}</div>;
  if (!accessToken || !role) return <div className="center">Не удалось войти</div>;

  return (
    <>
      {/* Возврат со страницы оплаты: один раз уводим на экран нужного заказа
          и сбрасываем цель, иначе редирект перекрывал бы сам экран. */}
      {deepLinkOrderId && role === Role.Client && (
        <DeepLinkRedirect orderId={deepLinkOrderId} onDone={() => setDeepLinkOrderId(null)} />
      )}
      <Routes>
        <Route path="/staff/*" element={<StaffApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
        {/* Catch-all сам решает по роли, а не отдельный маршрут «/». Telegram может
            открыть WebView с любым путём (напр. /index.html), поэтому нельзя
            полагаться на точное совпадение «/» — иначе персонал попадал в меню. */}
        <Route path="/*" element={<RoleHome role={role} />} />
      </Routes>
    </>
  );
}

/** Однократный переход на экран заказа после возврата с оплаты. */
function DeepLinkRedirect({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/order/${orderId}`, { replace: true });
    onDone();
    // Переход выполняется один раз на смену заказа.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);
  return null;
}

/** Стартовый экран по роли. Персонал уводим на свои разделы, клиент — в меню. */
function RoleHome({ role }: { role: Role }) {
  if (role === Role.Barista) return <Navigate to="/staff" replace />;
  if (role === Role.Owner || role === Role.Manager) return <Navigate to="/admin" replace />;
  return <ClientApp />;
}
