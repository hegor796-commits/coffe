// Идемпотентный сев демо-кофейни «Любовь-Марковь».
// Токен бота и id владельца берём из env, чтобы не хранить секреты в коде.
import crypto from 'node:crypto';
import { db, now } from './db.js';

const uid = () => crypto.randomUUID();

export function seedDemo() {
  const slug = 'lubov';
  const existing = db.prepare('SELECT id FROM tenants WHERE slug = ?').get(slug);
  if (existing) return existing.id;

  const botToken = process.env.DEMO_BOT_TOKEN || '';   // впишите реальный в env для демо
  const ownerTg = process.env.SEED_OWNER_TG_ID || '';
  const baristaTg = process.env.SEED_BARISTA_TG_ID || '';

  const tenantId = uid();
  db.prepare(
    `INSERT INTO tenants (id, slug, name, bot_token, webhook_secret, payment_mode, created_at)
     VALUES (?, ?, ?, ?, ?, 'offline', ?)`,
  ).run(tenantId, slug, 'Любовь-Марковь', botToken, crypto.randomBytes(16).toString('hex'), now());

  if (ownerTg) {
    db.prepare('INSERT INTO staff (id, tenant_id, tg_user_id, role, name) VALUES (?,?,?,?,?)')
      .run(uid(), tenantId, String(ownerTg), 'owner', 'Владелец');
  }
  if (baristaTg) {
    db.prepare('INSERT INTO staff (id, tenant_id, tg_user_id, role, name) VALUES (?,?,?,?,?)')
      .run(uid(), tenantId, String(baristaTg), 'barista', 'Бариста');
  }

  // Категории
  const cat = {};
  [['coffee', 'Кофе'], ['special', 'Спешлти'], ['dessert', 'Десерты']].forEach(([key, name], i) => {
    const id = uid();
    db.prepare('INSERT INTO categories (id, tenant_id, name, sort) VALUES (?,?,?,?)').run(id, tenantId, name, i);
    cat[key] = id;
  });

  // Модификаторы: размер (обяз.) и молоко (опц.)
  const sizeGroup = uid();
  db.prepare('INSERT INTO modifier_groups (id, tenant_id, name, required, min_select, max_select, sort) VALUES (?,?,?,1,1,1,0)')
    .run(sizeGroup, tenantId, 'Размер');
  [['S · 250 мл', 0, 1], ['M · 350 мл', 40, 0], ['L · 450 мл', 70, 0]].forEach(([n, d, def], i) =>
    db.prepare('INSERT INTO modifier_options (id, group_id, name, price_delta_rub, is_default, sort) VALUES (?,?,?,?,?,?)')
      .run(uid(), sizeGroup, n, d, def, i));

  const milkGroup = uid();
  db.prepare('INSERT INTO modifier_groups (id, tenant_id, name, required, min_select, max_select, sort) VALUES (?,?,?,0,0,1,1)')
    .run(milkGroup, tenantId, 'Молоко');
  [['Обычное', 0, 1], ['Растительное', 50, 0], ['Банановое', 60, 0]].forEach(([n, d, def], i) =>
    db.prepare('INSERT INTO modifier_options (id, group_id, name, price_delta_rub, is_default, sort) VALUES (?,?,?,?,?,?)')
      .run(uid(), milkGroup, n, d, def, i));

  // Товары (цены в рублях), как в мини-аппе
  const products = [
    ['Капучино', 220, 'coffee', true], ['Латте', 240, 'coffee', true], ['Американо', 180, 'coffee', true],
    ['Флэт-уайт', 260, 'coffee', true], ['Раф ванильный', 280, 'coffee', true], ['Эспрессо', 130, 'coffee', true],
    ['Матча-латте', 320, 'special', true], ['Фильтр V60', 260, 'special', true], ['Бамбл', 290, 'special', true],
    ['Какао', 240, 'special', true], ['Морковный торт', 260, 'dessert', false],
    ['Чизкейк', 290, 'dessert', false], ['Круассан', 180, 'dessert', false],
  ];
  products.forEach(([name, price, catKey, drink], i) => {
    const pid = uid();
    db.prepare('INSERT INTO products (id, tenant_id, category_id, name, price_rub, sort) VALUES (?,?,?,?,?,?)')
      .run(pid, tenantId, cat[catKey], name, price, i);
    if (drink) {
      db.prepare('INSERT INTO product_modifier_groups (product_id, group_id, sort) VALUES (?,?,0)').run(pid, sizeGroup);
      db.prepare('INSERT INTO product_modifier_groups (product_id, group_id, sort) VALUES (?,?,1)').run(pid, milkGroup);
    }
  });

  return tenantId;
}
