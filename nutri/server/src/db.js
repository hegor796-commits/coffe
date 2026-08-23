// Слой БД: встроенная SQLite (node:sqlite), без нативных зависимостей.
// Цены храним в рублях (целые) — под текущее меню кофейни.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';

mkdirSync(config.dataDir, { recursive: true });
export const db = new DatabaseSync(join(config.dataDir, 'app.db'));

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS tenants (
  id            TEXT PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  bot_token     TEXT NOT NULL,
  bot_username  TEXT,
  webhook_secret TEXT NOT NULL,
  payment_mode  TEXT NOT NULL DEFAULT 'offline',   -- offline | online
  payment_provider_token TEXT,                      -- секрет провайдера (ЮKassa) из BotFather
  delivery_enabled INTEGER NOT NULL DEFAULT 1,
  delivery_fee_rub INTEGER NOT NULL DEFAULT 50,
  delivery_note TEXT DEFAULT 'Доставляем только в апартаменты нашего здания.',
  primary_color TEXT DEFAULT '#F0692B',
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tg_user_id TEXT NOT NULL,
  role       TEXT NOT NULL,            -- barista | manager | owner
  name       TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, tg_user_id)
);
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id, role);

CREATE TABLE IF NOT EXISTS categories (
  id        TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  sort      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cat_tenant ON categories(tenant_id);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  price_rub   INTEGER NOT NULL,
  photo_url   TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  available   INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_prod_tenant ON products(tenant_id, category_id);

CREATE TABLE IF NOT EXISTS modifier_groups (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  required   INTEGER NOT NULL DEFAULT 0,
  min_select INTEGER NOT NULL DEFAULT 0,
  max_select INTEGER NOT NULL DEFAULT 1,
  sort       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modifier_options (
  id             TEXT PRIMARY KEY,
  group_id       TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  price_delta_rub INTEGER NOT NULL DEFAULT 0,
  is_default     INTEGER NOT NULL DEFAULT 0,
  sort           INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_opt_group ON modifier_options(group_id);

CREATE TABLE IF NOT EXISTS product_modifier_groups (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id   TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  sort       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number        TEXT NOT NULL,
  tg_user_id    TEXT NOT NULL,
  customer_name TEXT,
  status        TEXT NOT NULL DEFAULT 'created',
  fulfillment   TEXT NOT NULL DEFAULT 'pickup',   -- pickup | delivery
  addr_entrance TEXT,
  addr_floor    TEXT,
  addr_apt      TEXT,
  total_rub     INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'none',      -- none (оффлайн) | pending | paid | expired
  idem_key      TEXT,                              -- отпечаток содержимого: защита от дублей
  items_json    TEXT NOT NULL,                     -- снапшот позиций
  history_json  TEXT NOT NULL DEFAULT '[]',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(tenant_id, tg_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_updated ON orders(tenant_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(tenant_id, payment_status, created_at);

CREATE TABLE IF NOT EXISTS counters (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  order_seq INTEGER NOT NULL DEFAULT 0
);
`);

// Мягкие миграции для существующих БД (идемпотентно).
try { db.exec('ALTER TABLE products ADD COLUMN photo_url TEXT'); } catch {}
try { db.exec('ALTER TABLE products ADD COLUMN description TEXT'); } catch {}
try { db.exec('ALTER TABLE tenants ADD COLUMN delivery_fee_rub INTEGER NOT NULL DEFAULT 50'); } catch {}
try { db.exec('ALTER TABLE tenants ADD COLUMN payment_provider_token TEXT'); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'none'"); } catch {}
try { db.exec('ALTER TABLE orders ADD COLUMN idem_key TEXT'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(tenant_id, payment_status, created_at)'); } catch {}

export function now() {
  return Date.now();
}

// Следующий человекочитаемый номер заказа для кофейни: А-1, А-2, …
export function nextOrderNumber(tenantId) {
  db.prepare(
    `INSERT INTO counters (tenant_id, order_seq) VALUES (?, 1)
     ON CONFLICT(tenant_id) DO UPDATE SET order_seq = order_seq + 1`,
  ).run(tenantId);
  const { order_seq } = db.prepare('SELECT order_seq FROM counters WHERE tenant_id = ?').get(tenantId);
  return 'А-' + order_seq;
}

// Сколько живёт неоплаченный онлайн-заказ, прежде чем сгореть (мин).
export const PENDING_TTL_MIN = Number(process.env.PENDING_ORDER_TTL_MIN || 20);

/**
 * Гасит брошенные счета: клиент нажал «Оплатить», закрыл окно и ушёл.
 * Такие заказы висят в pending, засоряют историю и мешают повторить заказ.
 * Возвращает число погашенных заказов.
 */
export function expirePendingOrders() {
  const deadline = now() - PENDING_TTL_MIN * 60_000;
  const r = db.prepare(
    `UPDATE orders SET payment_status = 'expired', status = 'auto_cancelled', updated_at = ?
      WHERE payment_status = 'pending' AND created_at < ?`,
  ).run(now(), deadline);
  return r.changes || 0;
}
