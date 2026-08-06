import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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
  const [loading, setLoading] = useState(!accessToken);

  useEffect(() => {
    if (accessToken) {
      applyTheme(tenant?.branding?.primaryColor);
      return;
    }
    const initData = getInitData();
    // В dev-браузере initData пустой — показываем подсказку.
    const tenantSlug = getStartParam() ?? new URLSearchParams(location.search).get('tenant') ?? undefined;

    if (!initData) {
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
  }, [accessToken, setAuth, tenant?.branding?.primaryColor]);

  if (loading) return <div className="center">Загрузка…</div>;
  if (error) return <div className="center">{error}</div>;
  if (!accessToken || !role) return <div className="center">Не удалось войти</div>;

  return (
    <Routes>
      <Route path="/staff/*" element={<StaffApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/*" element={<ClientApp />} />
      {/* Роль по умолчанию решает стартовый экран. */}
      <Route path="/" element={<DefaultRedirect role={role} />} />
    </Routes>
  );
}

function DefaultRedirect({ role }: { role: Role }) {
  if (role === Role.Barista) return <Navigate to="/staff" replace />;
  if (role === Role.Owner || role === Role.Manager) return <Navigate to="/admin" replace />;
  return <Navigate to="/menu" replace />;
}
