import { getWebApp } from './telegram';

/**
 * Прокидывает тему Telegram и брендинг тенанта в CSS-переменные.
 * Вызывается после логина, когда известен primaryColor тенанта.
 */
export function applyTheme(primaryColor?: string): void {
  const wa = getWebApp();
  const tp = wa?.themeParams ?? {};
  const root = document.documentElement;

  const set = (name: string, value?: string) => {
    if (value) root.style.setProperty(name, value);
  };

  set('--bg', tp.bg_color ?? '#ffffff');
  set('--text', tp.text_color ?? '#111111');
  set('--hint', tp.hint_color ?? '#8a8a8a');
  set('--secondary-bg', tp.secondary_bg_color ?? '#f2f2f7');
  set('--button-text', tp.button_text_color ?? '#ffffff');
  set('--accent', primaryColor ?? tp.button_color ?? '#6F4E37');

  root.dataset.scheme = wa?.colorScheme ?? 'light';
}
