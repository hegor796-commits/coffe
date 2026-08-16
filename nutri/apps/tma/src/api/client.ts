import { useAuth } from '../store/auth';

/**
 * Адрес API. На проде Mini App отдаётся тем же сервером, что и API, поэтому
 * используем относительный путь (тот же origin) — не зависим от build-time
 * переменной. Локально (localhost) обращаемся к dev-серверу API на :3000.
 */
function resolveApiUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '';
  }
  return (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';
}

const API_URL = resolveApiUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

/** Fetch с Bearer-JWT и разбором ошибок. */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = useAuth.getState().accessToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // Протухший/невалидный access-токен (истёк по TTL или подписан прежним
    // секретом инстанса): сбрасываем сохранённую авторизацию и перезагружаемся,
    // чтобы приложение заново залогинилось через свежий Telegram initData.
    // Guard по времени — защита от возможной петли перезагрузок.
    if (res.status === 401 && auth) {
      const now = Date.now();
      const last = Number(sessionStorage.getItem('coffee_reauth_at') ?? '0');
      if (now - last > 10000) {
        sessionStorage.setItem('coffee_reauth_at', String(now));
        useAuth.getState().clear();
        window.location.reload();
      }
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = await res.text();
    }
    const message =
      (parsed as { message?: string })?.message ?? `Ошибка запроса (${res.status})`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message, parsed);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { API_URL };
