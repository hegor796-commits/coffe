// Конфигурация из переменных окружения. Секреты — только из env, не в коде.
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Railway показывает домен без схемы, и его так и копируют в переменную.
// Голый адрес ломает и вебхуки, и ссылки на мини-апп в кнопках бота, поэтому
// достраиваем https:// сами.
function externalUrl(value) {
  const v = String(value || '').trim().replace(/\/+$/, '');
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export const config = {
  port: Number(process.env.PORT || 3000),

  // Внешний HTTPS-адрес сервиса (для вебхуков ботов). На Railway — публичный домен.
  publicUrl: externalUrl(process.env.PUBLIC_URL),

  // Ссылка на сам мини-апп (кнопки ботов, приглашения). По умолчанию — этот же сервис.
  webAppBase: externalUrl(process.env.WEB_APP_BASE || process.env.PUBLIC_URL),

  // Каталог данных: сюда кладём SQLite-файл. На Railway монтируем Volume сюда.
  dataDir: resolve(process.env.DATA_DIR || join(__dirname, '..', 'data')),

  // Статика мини-приложения (папка design). Отдаётся с того же домена.
  webDir: resolve(process.env.WEB_DIR || join(__dirname, '..', '..', 'design')),

  // Telegram id владельцев платформы (супер-админов) — через запятую.
  // Только они могут создавать кофейни через админ-API.
  superadmins: (process.env.SUPERADMIN_TG_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Секрет для служебных вебхук-URL и админ-API (заголовок X-Admin-Secret).
  adminSecret: process.env.ADMIN_SECRET || '',

  // Свежесть Telegram initData (сек). 24 часа по умолчанию.
  initDataMaxAgeSec: Number(process.env.INITDATA_MAX_AGE_SEC || 86400),

  // Ставить ли вебхуки ботам автоматически при старте (нужен publicUrl).
  autoSetWebhooks: process.env.AUTO_SET_WEBHOOKS !== 'false',

  // --- Чек 54-ФЗ ---
  // Чек уходит в ЮKassa вместе с платежом, но это работает только с облачной
  // кассой. Без неё чек в запросе — ошибка, поэтому его можно выключить.
  receiptEnabled: !/^(false|0|no)$/i.test(String(process.env.YOOKASSA_RECEIPT_ENABLED ?? 'true').trim()),
  // Ставка НДС: 1 — без НДС, 2 — 0%, 3 — 10%, 4 — 20%, 5 — 10/110, 6 — 20/120.
  receiptVatCode: Number(process.env.YOOKASSA_VAT_CODE || process.env.RECEIPT_VAT_CODE || 1),

  // Имя бота без @ — для ссылки «Вернуться в Telegram» со страницы оплаты.
  botUsername: String(process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, ''),
};
