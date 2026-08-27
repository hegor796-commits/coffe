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
    `SELECT o.id, o.group_id, o.name, o.price_delta_rub, o.is_default, o.sort, o.available
       FROM modifier_options o JOIN modifier_groups g ON g.id = o.group_id
      WHERE g.tenant_id = ? ORDER BY o.sort`,
  ).all(tenantId);

  const groupsById = new Map(groups.map((g) => [g.id, {
    id: g.id, name: g.name, required: !!g.required, minSelect: g.min_select, maxSelect: g.max_select,
    options: options.filter((o) => o.group_id === g.id && o.available).map((o) => ({
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
    // Разглаживаем и приводим к строкам: мини-апп хранит выбор как
    // {группа: [id, ...]}, и версия с ошибкой присылала массив массивов.
    // Клиент мог остаться закешированным, поэтому чиним на входе.
    const optionIds = (Array.isArray(line.optionIds) ? line.optionIds : [])
      .flat(Infinity)
      .filter((v) => typeof v === 'string' || typeof v === 'number')
      .map(String);
    let unit = p.price_rub;
    const modNames = [];

    if (optionIds.length) {
      // Опции должны принадлежать группам этого товара.
      const allowed = db.prepare(
        `SELECT o.id, o.name, o.price_delta_rub, o.available, o.group_id, g.name AS group_name, g.max_select
           FROM modifier_options o
           JOIN product_modifier_groups pmg ON pmg.group_id = o.group_id
           JOIN modifier_groups g ON g.id = o.group_id
          WHERE pmg.product_id = ?`,
      ).all(p.id);
      const byId = new Map(allowed.map((o) => [o.id, o]));
      // Добавок можно взять несколько (сахар + корица), но не больше лимита
      // группы и не одну и ту же дважды — иначе цена и чек разъедутся.
      const seen = new Set();
      const perGroup = new Map();
      for (const oid of optionIds) {
        const o = byId.get(oid);
        if (!o) throw new Error('Недопустимая опция товара');
        if (!o.available) throw new Error(`«${o.name}» сейчас в стоп-листе`);
        if (seen.has(oid)) continue;
        seen.add(oid);
        const used = (perGroup.get(o.group_id) || 0) + 1;
        if (used > (o.max_select || 1)) throw new Error(`«${o.group_name}»: выбрано слишком много вариантов`);
        perGroup.set(o.group_id, used);
        unit += o.price_delta_rub;
        modNames.push(o.name);
      }
    }

    total += unit * qty;
    items.push({ productId: p.id, name: p.name, mods: modNames.join(' · '), unit, qty });
  }
  return { items, total };
}

// ============================================================
//  Режим работы кофейни
// ============================================================
// Часы храним в самом тенанте (hours_json), чтобы у каждой кофейни было своё
// расписание. Считаем всё в её часовом поясе: у клиента на телефоне может быть
// любой, а кофейня открывается по московскому времени.
export const DEFAULT_TZ = 'Europe/Moscow';

/** Расписание тенанта или null, если часы не заданы (тогда работаем всегда). */
export function shopSchedule(tenant) {
  let s = null;
  try { s = JSON.parse((tenant && tenant.hours_json) || 'null'); } catch { /* битый JSON — как без расписания */ }
  if (!s || !Array.isArray(s.days) || s.days.length !== 7) return null;
  return s;
}

const hhmmToMin = (v) => {
  const [h, m] = String(v || '').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};
const minToHhmm = (m) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};

// Локальные день недели и минуты с полуночи. Через Intl, потому что смещение
// пояса — дело ICU, а не арифметики с UTC.
const WEEKDAY_IDX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
function localNow(at, tz) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(at));
  const get = (t) => (parts.find((x) => x.type === t) || {}).value;
  return {
    dayIdx: WEEKDAY_IDX[get('weekday')] ?? 0,
    min: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/**
 * Состояние кофейни на момент `at`.
 * Приём заказов закрывается раньше самой кофейни: курьеру нужно успеть
 * доехать, баристе — приготовить. Поэтому у доставки и самовывоза свои отсечки.
 */
export function shopStatus(tenant, at = Date.now()) {
  const sch = shopSchedule(tenant);
  if (!sch) return { open: true, pickup: true, delivery: true, always: true };

  const tz = sch.tz || DEFAULT_TZ;
  const { dayIdx, min } = localNow(at, tz);
  const leadDelivery = Number((sch.lastOrderMin || {}).delivery ?? 60);
  const leadPickup = Number((sch.lastOrderMin || {}).pickup ?? 30);

  // Раскладываем окна работы соседних суток в одну шкалу минут от сегодняшней
  // полуночи. Вчерашнее окно берём тоже — оно может тянуться за полночь.
  const windows = [];
  for (let d = -1; d <= 7; d++) {
    const w = sch.days[(((dayIdx + d) % 7) + 7) % 7];
    if (!Array.isArray(w) || !w[0] || !w[1]) continue;   // выходной
    const open = d * 1440 + hhmmToMin(w[0]);
    let close = d * 1440 + hhmmToMin(w[1]);
    if (close <= open) close += 1440;                     // закрытие после полуночи
    windows.push({ open, close });
  }
  windows.sort((a, b) => a.open - b.open);

  const cur = windows.find((w) => min >= w.open && min < w.close) || null;
  const next = windows.find((w) => w.open > min) || null;

  return {
    open: !!cur,
    pickup: !!cur && min < cur.close - leadPickup,
    delivery: !!cur && min < cur.close - leadDelivery,
    closesAt: cur ? minToHhmm(cur.close) : null,
    lastPickup: cur ? minToHhmm(cur.close - leadPickup) : null,
    lastDelivery: cur ? minToHhmm(cur.close - leadDelivery) : null,
    opensAt: next ? minToHhmm(next.open) : null,
    opensInMin: next ? next.open - min : null,
    tz,
  };
}

/**
 * Добавки для экрана стоп-листа.
 * Обязательные группы («Объём») не отдаём: это не запас на складе, а выбор,
 * без которого товар не заказать — сняв все размеры, позицию просто сломали бы.
 * Одноимённые группы сводим в одну, одноимённые опции — в одну строку со
 * списком id: закончилось растительное молоко — снимаем везде, где предлагается.
 */
export function modifierGroupsOf(tenantId) {
  const rows = db.prepare(
    `SELECT g.name AS group_name, g.sort AS group_sort,
            o.id, o.name, o.price_delta_rub, o.available, o.sort
       FROM modifier_options o JOIN modifier_groups g ON g.id = o.group_id
      WHERE g.tenant_id = ? AND g.required = 0
      ORDER BY g.sort, g.name, o.sort`,
  ).all(tenantId);

  const byGroup = new Map();
  for (const r of rows) {
    if (!byGroup.has(r.group_name)) byGroup.set(r.group_name, new Map());
    const opts = byGroup.get(r.group_name);
    const cur = opts.get(r.name);
    if (cur) {
      cur.ids.push(r.id);
      // Строка считается доступной, только если доступны все её копии.
      cur.available = cur.available && !!r.available;
    } else {
      opts.set(r.name, { ids: [r.id], name: r.name, priceDelta: r.price_delta_rub, available: !!r.available });
    }
  }
  return [...byGroup].map(([name, opts]) => ({ name, options: [...opts.values()] }));
}

/** Час суток (0–23) в поясе кофейни — для разбивки заказов по часам. */
export function localHour(tenant, at) {
  const tz = (shopSchedule(tenant) || {}).tz || DEFAULT_TZ;
  try {
    return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(at)).find((p) => p.type === 'hour').value);
  } catch { return new Date(at).getHours(); }
}

/** Метка полуночи текущих суток в поясе кофейни. */
export function startOfLocalDay(tenant, at = Date.now()) {
  const tz = (shopSchedule(tenant) || {}).tz || DEFAULT_TZ;
  try {
    const p = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(at));
    const get = (t) => Number((p.find((x) => x.type === t) || {}).value || 0);
    // Сколько прошло с локальной полуночи — столько и отматываем назад.
    return at - ((get('hour') * 3600 + get('minute') * 60 + get('second')) * 1000);
  } catch {
    const d = new Date(at); d.setHours(0, 0, 0, 0); return d.getTime();
  }
}
