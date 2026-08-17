// Конфигурация из переменных окружения. Секреты — только из env, не в коде.
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 3000),

  // Внешний HTTPS-адрес сервиса (для вебхуков ботов). На Railway — публичный домен.
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),

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
};
