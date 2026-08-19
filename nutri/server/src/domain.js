// Доменная логика: роли, машина состояний заказа, сборка меню, расчёт цены.
// Согласована с packages/shared каркаса (статусы/переходы), цены — в рублях.
import { db } from './db.js';

export const ADMIN_ROLES = ['manager', 'owner'];
export const STAFF_ROLES = ['barista', 'manager', 'owner'];
export const ACTIVE_STATUSES = ['created', 'accepted', 'preparing', 'ready'];
export const TERMINAL_STATUSES = ['completed', 'rejected', 'auto_cancelled', 'cancelled_by_client'];

// Событие -> допустимый переход. Ключ: текущий статус.
const TRANSITIONS = {
  created:   { accept: 'accepted', reject: 'rejected', cancel_by_client: 'cancelled_by_client', auto_cancel: 'auto_cancelled' },
  accepted:  { start_preparing: 'preparing', reject: 'rejected' },
  preparing: { mark_ready: 'ready' },
  ready:     { complete: 'completed' },
  completed: {}, rejected: {}, auto_cancelled: {}, cancelled_by_client: {},
};

export function nextStatus(current, event) {
  return (TRANSITIONS[current] || {})[event] || null;
}

// Человекочитаемые подписи статуса для клиента.
export const STATUS_LABEL = {
  created: 'В работе', accepted: 'Принят', preparing: 'Готовим',
  ready: 'Готов', completed: 'Выдан', rejected: 'Отклонён',
  auto_cancelled: 'Отменён', cancelled_by_client: 'Отменён',
};

// Роль пользователя в кофейне: запись в staff или клиент.
export function roleOf(tenantId, tgUserId) {
  const s = db.prepare('SELECT role FROM staff WHERE tenant_id = ? AND tg_user_id = ? AND active = 1')
    .get(tenantId, String(tgUserId));
  return s ? s.role : 'client';
}

// Полное меню кофейни для мини-аппа: категории + товары + модификаторы.
export function buildMenu(tenantId) {
  const categories = db.prepare('SELECT id, name, sort FROM categories WHERE tenant_id = ? ORDER BY sort')
    .all(tenantId);
  const products = db.prepare(
    'SELECT id, category_id, name, description, price_rub, photo_url, sort, available FROM products WHERE tenant_id = ? ORDER BY sort',
  ).all(tenantId);
  const pmg = db.prepare('SELECT product_id, group_id, sort FROM product_modifier_groups').all();
  const groups = db.prepare('SELECT id, name, required, min_select, max_select FROM modifier_groups WHERE tenant_id = ?')
    .all(tenantId);
  const options = db.prepare(
    `SELECT o.id, o.group_id, o.name, o.price_delta_rub, o.is_default, o.sort
       FROM modifier_options o JOIN modifier_groups g ON g.id = o.group_id
      WHERE g.tenant_id = ? ORDER BY o.sort`,
  ).all(tenantId);

  const groupsById = new Map(groups.map((g) => [g.id, {
    id: g.id, name: g.name, required: !!g.required, minSelect: g.min_select, maxSelect: g.max_select,
    options: options.filter((o) => o.group_id === g.id).map((o) => ({
      id: o.id, name: o.name, priceDelta: o.price_delta_rub, isDefault: !!o.is_default,
    })),
  }]));

  return products.map((p) => ({
    id: p.id,
    categoryId: p.category_id,
    name: p.name,
    description: p.description || null,
    price: p.price_rub,
    photoUrl: p.photo_url || null,
    available: !!p.available,
    groups: pmg.filter((x) => x.product_id === p.id).sort((a, b) => a.sort - b.sort)
      .map((x) => groupsById.get(x.group_id)).filter(Boolean),
  }));
}

export function categoriesOf(tenantId) {
  return db.prepare('SELECT id, name FROM categories WHERE tenant_id = ? ORDER BY sort').all(tenantId);
}

/**
 * Серверный расчёт заказа из выбора клиента. НЕ доверяем ценам с клиента.
 * lines: [{ productId, optionIds: string[], qty }]
 * Возвращает { items, total } либо бросает Error с понятным сообщением.
 */
export function priceOrder(tenantId, lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('Пустой заказ');
  const items = [];
  let total = 0;

  for (const line of lines) {
    const p = db.prepare('SELECT id, name, price_rub, available FROM products WHERE id = ? AND tenant_id = ?')
      .get(line.productId, tenantId);
    if (!p) throw new Error('Товар не найден');
    if (!p.available) throw new Error(`«${p.name}» сейчас в стоп-листе`);

    const qty = Math.max(1, Math.min(50, Number(line.qty) || 1));
    const optionIds = Array.isArray(line.optionIds) ? line.optionIds : [];
    let unit = p.price_rub;
    const modNames = [];

    if (optionIds.length) {
      // Опции должны принадлежать группам этого товара.
      const allowed = db.prepare(
        `SELECT o.id, o.name, o.price_delta_rub
           FROM modifier_options o
           JOIN product_modifier_groups pmg ON pmg.group_id = o.group_id
          WHERE pmg.product_id = ?`,
      ).all(p.id);
      const byId = new Map(allowed.map((o) => [o.id, o]));
      for (const oid of optionIds) {
        const o = byId.get(oid);
        if (!o) throw new Error('Недопустимая опция товара');
        unit += o.price_delta_rub;
        modNames.push(o.name);
      }
    }

    total += unit * qty;
    items.push({ productId: p.id, name: p.name, mods: modNames.join(' · '), unit, qty });
  }
  return { items, total };
}
