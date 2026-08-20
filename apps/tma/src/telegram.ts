/** Тонкая обёртка над window.Telegram.WebApp (загружается telegram-web-app.js). */

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { start_param?: string; user?: { id: number } };
  themeParams: Record<string, string>;
  colorScheme: 'light' | 'dark';
  ready: () => void;
  expand: () => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  return getWebApp()?.initData ?? '';
}

export function getStartParam(): string | undefined {
  return getWebApp()?.initDataUnsafe?.start_param;
}

/** Тактильный отклик (безопасно, если API недоступен). */
export function haptic(type: 'success' | 'error' | 'warning'): void {
  getWebApp()?.HapticFeedback?.notificationOccurred(type);
}

/**
 * Открыть страницу оплаты. В Telegram — во внешнем браузере (openLink):
 * платёжные страницы банков и 3-D Secure во встроенном WebView работают
 * нестабильно. Вне Telegram — обычный переход по адресу.
 */
export function openPaymentPage(url: string): void {
  const wa = getWebApp();
  if (wa?.openLink) wa.openLink(url);
  else window.location.href = url;
}

/** Инициализация: сообщаем Telegram о готовности и разворачиваем на весь экран. */
export function initTelegram(): void {
  const wa = getWebApp();
  wa?.ready();
  wa?.expand();
}
