import { getWebApp } from './telegram';

/**
 * Дизайн «Classical» использует собственную фиксированную тёплую палитру
 * (задана в styles.css), поэтому тему Telegram/брендинг тенанта НЕ прокидываем
 * в CSS-переменные — иначе цвета поплывут. Здесь только фиксируем светлую
 * схему и подгоняем фон шапки Telegram под фон приложения.
 */
export function applyTheme(_primaryColor?: string): void {
  const wa = getWebApp();
  document.documentElement.dataset.scheme = 'light';
  try {
    (wa as unknown as { setBackgroundColor?: (c: string) => void })?.setBackgroundColor?.('#f3f2f2');
    (wa as unknown as { setHeaderColor?: (c: string) => void })?.setHeaderColor?.('#f3f2f2');
  } catch {
    /* старые клиенты Telegram могут не поддерживать — игнорируем */
  }
}
