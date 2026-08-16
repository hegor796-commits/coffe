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
  openLink?: (url: string) => void;
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

/** Инициализация: сообщаем Telegram о готовности и разворачиваем на весь экран. */
export function initTelegram(): void {
  const wa = getWebApp();
  wa?.ready();
  wa?.expand();
}
