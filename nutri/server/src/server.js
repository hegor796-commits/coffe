// Мультитенант-бэкенд: один сервис — много кофеен, у каждой свой Telegram-бот.
// Zero-dependency: node:http + node:sqlite + node:crypto.
import http from 'node:http';
import crypto from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { config } from './config.js';
import { db, now, nextOrderNumber, expirePendingOrders, PENDING_TTL_MIN } from './db.js';
import {
  roleOf, buildMenu, categoriesOf, priceOrder, nextStatus,
  STATUS_LABEL, STAFF_ROLES, ADMIN_ROLES, ACTIVE_STATUSES,
  shopSchedule, shopStatus, modifierGroupsOf, localHour, startOfLocalDay,
} from './domain.js';
import { validateInitData, getMe, setWebhook, sendMessage, webAppButton, createInvoiceLink, answerPreCheckoutQuery } from './telegram.js';
import { ykConfigured, createPayment, getPayment } from './yookassa.js';
import { seedDemo } from './seed.js';

const uid = () => crypto.randomUUID();
const webAppBase = config.webAppBase;

// ---------- HTTP helpers ----------
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Tenant,X-Init-Data,X-Admin-Secret');
}
function json(res, status, obj) {
  cors(res);
  // API кешировать нельзя. Без этих заголовков WebView Telegram спокойно
  // отдаёт из своего кеша старый /api/bootstrap — меню оказывается из
  // прошлого поколения базы, и заказ падает с «Недопустимая опция товара».
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

// ---------- Auth: определяем кофейню по slug и пользователя по подписи ----------
function authenticate(req) {
  const slug = req.headers['x-tenant'];
  const initData = req.headers['x-init-data'];
  if (!slug) return { error: 'no_tenant' };
  const tenant = db.prepare("SELECT * FROM tenants WHERE slug = ? AND status = 'active'").get(String(slug));
  if (!tenant) return { error: 'tenant_not_found' };
  if (!tenant.bot_token) return { error: 'tenant_no_bot' };

  const v = validateInitData(tenant.bot_token, initData, config.initDataMaxAgeSec);
  if (!v.ok) return { error: 'unauthorized', reason: v.reason, tenant };

  const role = roleOf(tenant.id, v.user.id);
  return { tenant, user: v.user, role };
}

// ---------- Сериализация ----------
function addrString(o) {
  if (o.fulfillment !== 'delivery') return '';
  return `Подъезд ${o.addr_entrance || '—'}, этаж ${o.addr_floor || '—'}, апарт. ${o.addr_apt || '—'}`;
}
function orderPublic(o) {
  return {
    id: o.id, number: o.number, status: o.status, statusLabel: STATUS_LABEL[o.status] || o.status,
    fulfillment: o.fulfillment, address: addrString(o), total: o.total_rub,
    comment: o.comment || '',
    items: JSON.parse(o.items_json), createdAt: o.created_at, updatedAt: o.updated_at,
  };
}
/**
 * Отпечаток содержимого заказа: тот же клиент + те же позиции + тот же способ
 * получения дают тот же ключ. Позиции сортируем — порядок в корзине не важен.
 */
function orderFingerprint(tgUserId, fulfillment, d, items) {
  const lines = items
    .map((it) => `${it.productId}|${it.mods}|${it.qty}|${it.unit}`)
    .sort()
    .join(';');
  const addr = fulfillment === 'delivery'
    ? `${String(d.entrance || '').trim()}/${String(d.floor || '').trim()}/${String(d.apt || '').trim()}`
    : '';
  return crypto.createHash('sha256')
    .update(`${tgUserId}\n${fulfillment}\n${addr}\n${lines}`)
    .digest('hex');
}

function orderStaff(o) {
  return {
    ...orderPublic(o),
    customer: o.customer_name || 'Гость',
    tgUserId: o.tg_user_id,
  };
}

// ---------- Уведомления через бота кофейни ----------
async function notifyStaffNewOrder(tenant, o) {
  const staff = db.prepare("SELECT tg_user_id FROM staff WHERE tenant_id = ? AND active = 1").all(tenant.id);
  const items = JSON.parse(o.items_json)
    .map((it) => `• ${it.qty}× ${it.name}${it.mods ? ` (${it.mods})` : ''}`).join('\n');
  const head = o.fulfillment === 'delivery' ? `🛵 Доставка · ${addrString(o)}` : '🛍 Самовывоз';
  const note = o.comment ? `\n💬 <i>${o.comment}</i>` : '';
  const text = `🆕 <b>Новый заказ ${o.number}</b>\n${head}\n${items}${note}\nСумма: ${o.total_rub} ₽`;
  const kb = webAppBase ? webAppButton('Открыть ленту', `${webAppBase}/?t=${tenant.slug}`) : undefined;
  for (const s of staff) await sendMessage(tenant.bot_token, s.tg_user_id, text, kb);
}
/**
 * Отмечает заказ оплаченным и пускает его в работу. Общая точка для обоих
 * платёжных путей (шторка Telegram и вебхук ЮKassa), поэтому идемпотентна:
 * повторный вебхук по тому же заказу ничего не задваивает.
 */
async function markOrderPaid(tenant, order) {
  if (!order || order.payment_status === 'paid') return null;
  // Счёт мог сгореть между созданием и оплатой — деньги уже взяты, поэтому
  // возвращаем заказ в работу, а не оставляем отменённым.
  db.prepare("UPDATE orders SET payment_status = 'paid', status = 'created', updated_at = ? WHERE id = ?")
    .run(now(), order.id);
  const paid = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  notifyStaffNewOrder(tenant, paid).catch((e) => console.error('notify staff', e));
  sendMessage(tenant.bot_token, paid.tg_user_id,
    `💳 Оплата получена. Заказ ${paid.number} принят в работу!`).catch(() => {});
  return paid;
}

/**
 * Сверка «зависших» онлайн-заказов с ЮKassa. Вебхук может быть не настроен, а
 * клиент — не довести опрос статуса (закрыл браузер, свернул Telegram). Тогда
 * оплаченный заказ остаётся pending и рискует сгореть по TTL. Поэтому спрашиваем
 * ЮKassa сами:
 *  - succeeded → проводим заказ (markOrderPaid поднимет даже уже отменённый —
 *    деньги-то взяты);
 *  - canceled  → гасим;
 *  - всё ещё pending и старше TTL → гасим как брошенный.
 * Дополнительно проверяем недавно отменённые счета: если заказ успели погасить
 * до того, как оплата подтвердилась, — восстанавливаем его.
 */
async function reconcilePendingOrders() {
  const lookback = now() - 24 * 60 * 60_000;   // отменённые за сутки ещё можно спасти
  const deadline = now() - PENDING_TTL_MIN * 60_000;
  const rows = db.prepare(
    `SELECT id, tenant_id, payment_id, payment_status, created_at FROM orders
      WHERE payment_id IS NOT NULL
        AND ( payment_status = 'pending'
           OR (payment_status = 'expired' AND updated_at >= ?) )`,
  ).all(lookback);
  if (!rows.length) return;

  const tenantCache = new Map();
  const tenantOf = (id) => {
    if (!tenantCache.has(id)) tenantCache.set(id, db.prepare('SELECT * FROM tenants WHERE id = ?').get(id));
    return tenantCache.get(id);
  };

  for (const row of rows) {
    const tenant = tenantOf(row.tenant_id);
    if (!tenant || !ykConfigured(tenant)) continue;
    let check;
    try { check = await getPayment(tenant, row.payment_id); }
    catch (e) { console.error('[reconcile] getPayment', e && e.message); continue; }
    if (!check.ok) continue;

    if (check.status === 'succeeded' && check.paid) {
      const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(row.id);
      const paid = await markOrderPaid(tenant, o);
      if (paid) console.log(`[reconcile] заказ ${paid.number} оплачен по факту — проведён и отправлен баристе`);
    } else if (check.status === 'canceled') {
      if (row.payment_status === 'pending') {
        db.prepare("UPDATE orders SET payment_status = 'expired', status = 'auto_cancelled', updated_at = ? WHERE id = ? AND payment_status = 'pending'")
          .run(now(), row.id);
      }
    } else if (row.payment_status === 'pending' && row.created_at < deadline) {
      // Счёт так и не оплачен и уже просрочен — гасим как брошенный.
      db.prepare("UPDATE orders SET payment_status = 'expired', status = 'auto_cancelled', updated_at = ? WHERE id = ? AND payment_status = 'pending'")
        .run(now(), row.id);
    }
  }
}

async function notifyClientStatus(tenant, o) {
  const map = {
    accepted: `✅ Заказ ${o.number} принят.`,
    preparing: `👨‍🍳 Готовим заказ ${o.number}.`,
    ready: `☕ Заказ ${o.number} готов! Можно забирать${o.fulfillment === 'delivery' ? ', курьер уже выезжает' : ''}.`,
    completed: `Спасибо! Заказ ${o.number} выдан. Ждём снова 🥕`,
    rejected: `😔 Заказ ${o.number} отклонён.`,
  };
  const text = map[o.status];
  if (text) await sendMessage(tenant.bot_token, o.tg_user_id, text);
}

// ---------- Статика мини-приложения ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.json': 'application/json' };
async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = normalize(join(config.webDir, rel));
  if (!filePath.startsWith(config.webDir)) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) throw new Error('dir');
    const buf = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream', 'Cache-Control': rel.endsWith('.html') ? 'no-cache' : 'public, max-age=300' });
    res.end(buf);
  } catch {
    // SPA-фолбэк на index.html
    try {
      const buf = await readFile(join(config.webDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(buf);
    } catch { res.writeHead(404); res.end('Not found'); }
  }
}

// ---------- Роутинг ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname;
  const method = req.method;

  if (method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }

  try {
    // --- Вебхук бота конкретной кофейни: /tg/:tenantId ---
    if (path.startsWith('/tg/') && method === 'POST') {
      const tenantId = path.slice(4);
      const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
      if (!tenant) { res.writeHead(404); return res.end(); }
      const secret = req.headers['x-telegram-bot-api-secret-token'];
      if (secret !== tenant.webhook_secret) { res.writeHead(401); return res.end(); }
      const update = await readBody(req);
      await handleBotUpdate(tenant, update);
      res.writeHead(200); return res.end('ok');
    }

    // --- Вебхук ЮKassa: /yk/:tenantId/:secret ---
    // ЮKassa не подписывает уведомления, поэтому секрет держим в самом URL,
    // а факт оплаты всё равно перепроверяем запросом к их API.
    if (path.startsWith('/yk/') && method === 'POST') {
      const [, , tenantId, secret] = path.split('/');
      const tenant = tenantId ? db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) : null;
      if (!tenant || secret !== tenant.webhook_secret) { res.writeHead(404); return res.end(); }
      const note = await readBody(req);
      // Отвечаем 200 всегда: любой не-200 заставит ЮKassa слать повторы сутки.
      handleYooKassaNotification(tenant, note).catch((e) => console.error('[yookassa]', e));
      res.writeHead(200); return res.end('ok');
    }

    // --- Health ---
    if (path === '/api/health') return json(res, 200, { ok: true, time: now() });

    // --- Админка платформы (супер-админ) ---
    if (path.startsWith('/api/admin/')) return await adminRoutes(req, res, path, method);

    // --- API мини-аппа (требует авторизацию) ---
    if (path.startsWith('/api/')) {
      const auth = authenticate(req);
      if (auth.error) return json(res, auth.error === 'unauthorized' ? 401 : 400, { error: auth.error, reason: auth.reason });
      // await обязателен: без него отказ промиса не попадает в catch ниже
      // и роняет весь процесс — один битый заказ убивал сервер.
      return await apiRoutes(req, res, path, method, auth);
    }

    // --- Иначе статика мини-аппа ---
    if (method === 'GET') return await serveStatic(req, res, path);
    res.writeHead(405); res.end('Method not allowed');
  } catch (e) {
    console.error('[error]', e);
    json(res, 500, { error: 'server_error' });
  }
});

// ---------- /api/* (авторизованные) ----------
async function apiRoutes(req, res, path, method, { tenant, user, role }) {
  // Загрузка приложения: инфо о кофейне, роль, меню.
  if (path === '/api/bootstrap' && method === 'GET') {
    // Диагностика доставки кода: свежий мини-апп добавляет к GET параметр `_`
    // для обхода кеша. Если он есть — на устройстве новый script.js. Если
    // запросов нет вовсе, а заказы идут, значит меню отдаётся из кеша WebView.
    const fresh = new URL(req.url, 'http://x').searchParams.has('_');
    console.log(`[bootstrap] user=${user.id} role=${role} клиент=${fresh ? 'НОВЫЙ (обходит кеш)' : 'СТАРЫЙ (без обхода кеша)'}`);
    // Запоминаем клиента для счётчика «сколько человек пользуется ботом».
    const uname = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Гость';
    db.prepare(
      `INSERT INTO clients (tenant_id, tg_user_id, name, first_seen) VALUES (?,?,?,?)
       ON CONFLICT(tenant_id, tg_user_id) DO UPDATE SET name = excluded.name`,
    ).run(tenant.id, String(user.id), uname, now());
    // Доставка доступна, если включена и не поставлена на паузу владельцем.
    const delivPaused = tenant.delivery_paused_until && tenant.delivery_paused_until > now();
    return json(res, 200, {
      tenant: { slug: tenant.slug, name: tenant.name, primaryColor: tenant.primary_color, paymentMode: tenant.payment_mode,
        deliveryEnabled: !!tenant.delivery_enabled && !delivPaused,
        deliveryPausedUntil: delivPaused ? tenant.delivery_paused_until : 0,
        deliveryFee: tenant.delivery_fee_rub ?? 50, deliveryNote: tenant.delivery_note, packagingFee: tenant.packaging_fee_rub ?? 0,
        phone: tenant.phone || '',
        payByLink: tenant.payment_mode === 'online' && ykConfigured(tenant),
        needEmail: config.receiptEnabled },
      role,
      user: { id: String(user.id), name: [user.first_name, user.last_name].filter(Boolean).join(' ') },
      categories: categoriesOf(tenant.id),
      menu: buildMenu(tenant.id),
      // Расписание отдаём целиком: мини-апп может висеть открытым часами и
      // должен сам пересчитывать статус, не дёргая сервер.
      hours: shopSchedule(tenant),
      shop: shopStatus(tenant),
      // Полный список добавок нужен только персоналу — на экране стоп-листа.
      modifierGroups: STAFF_ROLES.includes(role) ? modifierGroupsOf(tenant.id) : undefined,
      serverTime: now(),
    });
  }

  // Клиент создаёт заказ.
  if (path === '/api/orders' && method === 'POST') {
    const body = await readBody(req);
    let priced;
    try { priced = priceOrder(tenant.id, body.lines); }
    catch (e) {
      // Диагностика: что именно прислал клиент и почему отклонили. Для каждой
      // позиции печатаем название товара, допустимые опции и какие из
      // присланных лишние — сразу видно, старая ли это корзина/меню.
      // Отличаем устаревшее меню от прочих отказов: если у позиции НИ ОДНА
      // присланная опция не принадлежит товару, приложение работает по меню
      // другого поколения (кеш WebView). Обычная ошибка так не выглядит.
      let staleMenu = false;
      for (const l of (body.lines || [])) {
        const p = db.prepare('SELECT name FROM products WHERE id = ? AND tenant_id = ?').get(l.productId, tenant.id);
        const allowed = db.prepare(
          `SELECT o.id, o.name FROM modifier_options o
             JOIN product_modifier_groups pmg ON pmg.group_id = o.group_id
            WHERE pmg.product_id = ?`,
        ).all(l.productId);
        const allowedIds = new Set(allowed.map((o) => o.id));
        const sent = l.optionIds || [];
        const bad = sent.filter((id) => !allowedIds.has(id));
        if (p && sent.length && bad.length === sent.length) staleMenu = true;
        console.error(`[order] отклонён (${e.message}). tenant=${tenant.id}`
          + ` товар=${p ? `«${p.name}»` : 'НЕ НАЙДЕН'} (${l.productId})`
          + ` прислано=[${sent.join(',')}] лишние=[${bad.join(',')}]`
          + ` допустимо=${allowed.length} опц.`);

        // Чем на самом деле являются отвергнутые id: их может не быть в базе
        // вовсе (устаревшее меню) либо они могут принадлежать другой группе
        // или другой кофейне — это уже расхождение привязок, а не кеш.
        for (const oid of bad) {
          const o = db.prepare(
            `SELECT o.name, g.id AS gid, g.name AS gname, g.tenant_id AS tid
               FROM modifier_options o JOIN modifier_groups g ON g.id = o.group_id
              WHERE o.id = ?`,
          ).get(String(oid));
          if (!o) { console.error(`[order]    ${oid} — такой опции в базе НЕТ`); continue; }
          const links = db.prepare('SELECT COUNT(*) n FROM product_modifier_groups WHERE group_id = ?').get(o.gid).n;
          console.error(`[order]    ${oid} = «${o.name}» из группы «${o.gname}»`
            + `${o.tid === tenant.id ? '' : ' ЧУЖОЙ КОФЕЙНИ'} — группа привязана к ${links} товарам`);
        }
        // Что клиент должен был получить в меню для этого товара.
        if (p) {
          const byGroup = db.prepare(
            `SELECT g.name AS gname, o.id, o.name
               FROM modifier_options o
               JOIN product_modifier_groups pmg ON pmg.group_id = o.group_id
               JOIN modifier_groups g ON g.id = o.group_id
              WHERE pmg.product_id = ? ORDER BY g.sort, o.sort`,
          ).all(l.productId);
          const groupsSeen = [...new Set(byGroup.map((r) => r.gname))];
          for (const gn of groupsSeen) {
            const items = byGroup.filter((r) => r.gname === gn).map((r) => `${r.name}=${r.id.slice(0, 8)}`);
            console.error(`[order]    актуальная «${gn}»: ${items.join(' ')}`);
          }
        }
      }
      if (staleMenu) {
        // Отдельный код, чтобы мини-апп не уходил в цикл «обновить меню» —
        // обновлять бесполезно, пока приложение читает меню из кеша.
        // Текст рассчитан на показ пользователю как есть.
        return json(res, 400, {
          error: 'menu_stale',
          message: 'Приложение показывает устаревшее меню. Закройте его полностью и откройте заново',
        });
      }
      return json(res, 400, { error: 'bad_order', message: e.message });
    }

    const fulfillment = body.fulfillment === 'delivery' ? 'delivery' : 'pickup';
    const d = body.delivery || {};

    // Часы работы проверяет сервер: у клиента часы могут врать, а заказ,
    // упавший баристе после закрытия, готовить уже некому.
    const shop = shopStatus(tenant);
    if (!shop.open) {
      return json(res, 409, { error: 'shop_closed', shop,
        message: shop.opensAt ? `Кофейня закрыта. Откроемся в ${shop.opensAt}` : 'Кофейня закрыта' });
    }
    if (fulfillment === 'delivery' && !shop.delivery) {
      return json(res, 409, { error: 'delivery_closed', shop,
        message: `Доставку принимаем до ${shop.lastDelivery}. Самовывоз — до ${shop.lastPickup}` });
    }
    if (fulfillment === 'pickup' && !shop.pickup) {
      return json(res, 409, { error: 'pickup_closed', shop,
        message: `Заказы принимаем до ${shop.lastPickup}. Кофейня закроется в ${shop.closesAt}` });
    }
    if (fulfillment === 'delivery') {
      if (!tenant.delivery_enabled) return json(res, 400, { error: 'delivery_off', message: 'Доставка недоступна' });
      // Владелец мог поставить доставку на паузу (например, курьер занят).
      if (tenant.delivery_paused_until && tenant.delivery_paused_until > now()) {
        return json(res, 409, { error: 'delivery_paused', message: 'Доставка временно приостановлена. Доступен самовывоз' });
      }
      if (!String(d.entrance || '').trim() || !String(d.floor || '').trim() || !String(d.apt || '').trim())
        return json(res, 400, { error: 'need_address', message: 'Укажите подъезд, этаж и апартаменты' });
    }
    // Комментарий клиента к заказу — до 300 символов.
    const comment = String(body.comment || '').trim().slice(0, 300);
    // Наценка за доставку добавляется к сумме заказа (самовывоз — бесплатно).
    const deliveryFee = fulfillment === 'delivery' ? (tenant.delivery_fee_rub ?? 50) : 0;
    const packagingFee = tenant.packaging_fee_rub ?? 0;
    const orderTotal = priced.total + deliveryFee + packagingFee;
    const ts = now();
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Гость';
    // Онлайн-оплата: сначала прямая касса ЮKassa (ссылка в браузер + СБП),
    // иначе — старая платёжная шторка Telegram. Нет ни того, ни другого — касса.
    const viaYooKassa = tenant.payment_mode === 'online' && ykConfigured(tenant);
    const viaTelegram = tenant.payment_mode === 'online' && !viaYooKassa && !!tenant.payment_provider_token;
    const online = viaYooKassa || viaTelegram;

    // Чек 54-ФЗ уходит на e-mail. Шторка Telegram спрашивала его сама, при
    // оплате по ссылке e-mail собираем в приложении. Без облачной кассы чек не
    // формируется, и e-mail тогда не нужен.
    const email = String(body.email || '').trim().slice(0, 120);
    if (viaYooKassa && config.receiptEnabled && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      return json(res, 400, { error: 'need_email', message: 'Укажите e-mail — на него придёт чек' });
    }

    // Прежде чем заводить заказ — гасим брошенные счета, чтобы они не мешали
    // повторить тот же заказ и не висели в истории клиента.
    expirePendingOrders();

    // Отпечаток содержимого: тот же набор позиций + тот же способ получения.
    const idemKey = orderFingerprint(String(user.id), fulfillment, d, priced.items);

    // Повторный клик «Оплатить» (двойное нажатие, возврат после отмены окна
    // оплаты) не должен плодить заказы: переиспользуем ещё живой счёт.
    let o = null;
    if (online) {
      o = db.prepare(
        `SELECT * FROM orders WHERE tenant_id = ? AND tg_user_id = ? AND idem_key = ?
           AND payment_status = 'pending' AND total_rub = ?
         ORDER BY created_at DESC LIMIT 1`,
      ).get(tenant.id, String(user.id), idemKey, orderTotal);
    }

    if (!o) {
      const id = uid();
      const number = nextOrderNumber(tenant.id);
      db.prepare(
        `INSERT INTO orders (id, tenant_id, number, tg_user_id, customer_name, status, fulfillment,
          addr_entrance, addr_floor, addr_apt, total_rub, payment_status, idem_key, customer_email, comment, items_json, history_json, created_at, updated_at)
         VALUES (?,?,?,?,?,'created',?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(id, tenant.id, number, String(user.id), name, fulfillment,
        d.entrance || null, d.floor || null, d.apt || null, orderTotal, online ? 'pending' : 'none', idemKey,
        email || null, comment || null, JSON.stringify(priced.items), JSON.stringify([{ status: 'created', at: ts }]), ts, ts);
      o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    }
    const number = o.number;
    const id = o.id;

    if (online) {
      // Чек 54-ФЗ для боевой ЮKassa: позиция на каждый товар + доставка.
      const vatCode = config.receiptVatCode;
      const receiptItems = priced.items.map((it) => ({
        description: `${it.name}${it.mods ? ' · ' + it.mods : ''}`.slice(0, 128),
        quantity: String(it.qty),
        amount: { value: it.unit.toFixed(2), currency: 'RUB' },
        vat_code: vatCode,
        payment_subject: 'commodity',
        payment_mode: 'full_prepayment',
      }));
      if (deliveryFee > 0) {
        receiptItems.push({
          description: 'Доставка',
          quantity: '1',
          amount: { value: deliveryFee.toFixed(2), currency: 'RUB' },
          vat_code: vatCode,
          payment_subject: 'service',
          payment_mode: 'full_prepayment',
        });
      }
      if (packagingFee > 0) {
        receiptItems.push({
          description: 'Упаковка',
          quantity: '1',
          amount: { value: packagingFee.toFixed(2), currency: 'RUB' },
          vat_code: vatCode,
          payment_subject: 'service',
          payment_mode: 'full_prepayment',
        });
      }
      // --- Оплата по ссылке (ЮKassa напрямую): карта или СБП в браузере ---
      if (viaYooKassa) {
        const receipt = config.receiptEnabled ? { customer: { email }, items: receiptItems } : null;
        const bot = tenant.bot_username || config.botUsername;
        const returnUrl = `${config.publicUrl || webAppBase}/pay-return.html`
          + `?o=${encodeURIComponent(id)}${bot ? `&bot=${encodeURIComponent(bot)}` : ''}`;
        const pay = await createPayment(tenant, {
          orderId: id,
          amountRub: orderTotal,
          description: `Заказ ${number}`,
          returnUrl,
          receipt,
        });
        if (!pay.ok) {
          console.error('[yookassa] createPayment failed:', pay.error);
          return json(res, 502, { error: 'payment_failed', message: 'Не удалось создать оплату. Попробуйте ещё раз' });
        }
        db.prepare('UPDATE orders SET payment_id = ?, updated_at = ? WHERE id = ?').run(pay.paymentId, now(), id);
        return json(res, 201, { order: orderPublic(o), paymentUrl: pay.paymentUrl });
      }

      // --- Запасной путь: платёжная шторка Telegram ---
      // Счёт на всю сумму одной строкой (копейки). Персонал уведомим после оплаты.
      const inv = await createInvoiceLink(tenant.bot_token, {
        title: `Заказ ${number}`,
        description: priced.items.map((it) => `${it.qty}× ${it.name}`).join(', ').slice(0, 255) || 'Заказ',
        payload: `order:${id}`,
        providerToken: tenant.payment_provider_token,
        currency: 'RUB',
        prices: [{ label: `Заказ ${number}`, amount: orderTotal * 100 }],
        providerData: { receipt: { items: receiptItems } },
        needEmail: true,
        sendEmailToProvider: true,
      });
      if (!inv || !inv.ok || !inv.result) {
        console.error('[invoice] createInvoiceLink failed:', inv && inv.description);
        return json(res, 502, { error: 'invoice_failed', message: 'Не удалось создать счёт на оплату' });
      }
      return json(res, 201, { order: orderPublic(o), invoiceLink: inv.result });
    }

    notifyStaffNewOrder(tenant, o).catch((e) => console.error('notify staff', e));
    return json(res, 201, { order: orderPublic(o) });
  }

  // Клиент опрашивает статус оплаты, пока открыта страница ожидания.
  // Здесь же дёргаем ЮKassa напрямую, поэтому оплата долетает даже если вебхук
  // в личном кабинете не настроен.
  if (path.startsWith('/api/orders/') && path.endsWith('/payment') && method === 'GET') {
    const orderId = path.slice('/api/orders/'.length, -'/payment'.length);
    const o = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ? AND tg_user_id = ?')
      .get(orderId, tenant.id, String(user.id));
    if (!o) return json(res, 404, { error: 'not_found' });

    if (o.payment_status === 'pending' && o.payment_id && ykConfigured(tenant)) {
      const check = await getPayment(tenant, o.payment_id);
      if (check.ok && check.status === 'succeeded' && check.paid) {
        const paid = await markOrderPaid(tenant, o);
        if (paid) return json(res, 200, { paymentStatus: 'paid', order: orderPublic(paid) });
      } else if (check.ok && check.status === 'canceled') {
        db.prepare("UPDATE orders SET payment_status = 'expired', status = 'auto_cancelled', updated_at = ? WHERE id = ?")
          .run(now(), o.id);
        return json(res, 200, { paymentStatus: 'expired' });
      }
    }
    const fresh = db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id);
    return json(res, 200, { paymentStatus: fresh.payment_status, order: orderPublic(fresh) });
  }

  // Клиент: свои заказы. Неоплаченные счета (pending) и сгоревшие (expired)
  // в историю не попадают — иначе брошенные попытки оплаты копятся списком.
  if (path === '/api/orders/mine' && method === 'GET') {
    expirePendingOrders();
    const rows = db.prepare(
      `SELECT * FROM orders WHERE tenant_id = ? AND tg_user_id = ?
         AND payment_status NOT IN ('pending','expired')
       ORDER BY created_at DESC LIMIT 50`,
    ).all(tenant.id, String(user.id));
    return json(res, 200, { orders: rows.map(orderPublic) });
  }

  // Персонал: лента заказов (активные + недавний архив).
  if (path === '/api/staff/orders' && method === 'GET') {
    if (!STAFF_ROLES.includes(role)) return json(res, 403, { error: 'forbidden' });
    // Неоплаченные онлайн-заказы (pending) и брошенные счета (expired) в ленту
    // не попадают — бариста видит только то, за что уже заплатили.
    expirePendingOrders();
    const rows = db.prepare(
      `SELECT * FROM orders WHERE tenant_id = ? AND payment_status NOT IN ('pending','expired')
       ORDER BY created_at DESC LIMIT 100`,
    ).all(tenant.id);
    return json(res, 200, {
      active: rows.filter((o) => ACTIVE_STATUSES.includes(o.status)).map(orderStaff),
      archive: rows.filter((o) => !ACTIVE_STATUSES.includes(o.status)).slice(0, 30).map(orderStaff),
    });
  }

  // Персонал: перевод статуса заказа по событию FSM.
  const evMatch = path.match(/^\/api\/staff\/orders\/([^/]+)\/event$/);
  if (evMatch && method === 'POST') {
    if (!STAFF_ROLES.includes(role)) return json(res, 403, { error: 'forbidden' });
    const body = await readBody(req);
    const o = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(evMatch[1], tenant.id);
    if (!o) return json(res, 404, { error: 'not_found' });
    const target = nextStatus(o.status, body.event);
    if (!target) return json(res, 409, { error: 'bad_transition', from: o.status, event: body.event });
    const ts = now();
    const history = JSON.parse(o.history_json); history.push({ status: target, at: ts, by: String(user.id) });
    db.prepare('UPDATE orders SET status = ?, history_json = ?, updated_at = ? WHERE id = ?')
      .run(target, JSON.stringify(history), ts, o.id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id);
    notifyClientStatus(tenant, updated).catch((e) => console.error('notify client', e));
    return json(res, 200, { order: orderStaff(updated) });
  }

  // Персонал/админ: стоп-лист.
  if (path === '/api/staff/stop' && method === 'POST') {
    if (!STAFF_ROLES.includes(role)) return json(res, 403, { error: 'forbidden' });
    const body = await readBody(req);
    const on = body.available ? 1 : 0;
    // Стоп-лист покрывает и добавки: закончилось растительное молоко — снимаем
    // опцию, и она пропадает из шторки товара, а не только из меню.
    const optionIds = Array.isArray(body.optionIds) ? body.optionIds
      : body.optionId ? [body.optionId] : null;
    if (optionIds) {
      // Одноимённая опция может встречаться в нескольких группах — снимаем все.
      const stmt = db.prepare(
        `UPDATE modifier_options SET available = ?
          WHERE id = ? AND group_id IN (SELECT id FROM modifier_groups WHERE tenant_id = ?)`,
      );
      let changed = 0;
      for (const oid of optionIds.slice(0, 50)) changed += stmt.run(on, String(oid), tenant.id).changes || 0;
      if (!changed) return json(res, 404, { error: 'not_found' });
      return json(res, 200, { ok: true });
    }
    const r = db.prepare('UPDATE products SET available = ? WHERE id = ? AND tenant_id = ?')
      .run(on, body.productId, tenant.id);
    if (!r.changes) return json(res, 404, { error: 'not_found' });
    return json(res, 200, { ok: true });
  }

  // Владелец/менеджер: список сотрудников кофейни.
  if (path === '/api/staff/list' && method === 'GET') {
    if (!ADMIN_ROLES.includes(role)) return json(res, 403, { error: 'forbidden' });
    const rows = db.prepare('SELECT tg_user_id, role, name, active FROM staff WHERE tenant_id = ? ORDER BY role, name')
      .all(tenant.id);
    return json(res, 200, {
      staff: rows.map((s) => ({ tgUserId: s.tg_user_id, role: s.role, name: s.name || 'Сотрудник', active: !!s.active })),
    });
  }

  // Владелец/менеджер: сводка за сегодня (выручка, число заказов, распределение по часам).
  if (path === '/api/staff/summary' && method === 'GET') {
    if (!ADMIN_ROLES.includes(role)) return json(res, 403, { error: 'forbidden' });
    // «Сегодня» — по часам кофейни, а не по часовому поясу контейнера. На
    // Railway он UTC, из-за чего сутки обнулялись в 03:00 по Москве, и разные
    // владельцы видели разные цифры в зависимости от момента открытия.
    const dayStart = startOfLocalDay(tenant);
    // Неоплаченные счета в выручку не идут — считаем только состоявшиеся заказы.
    const rows = db.prepare(
      `SELECT total_rub, status, created_at FROM orders
        WHERE tenant_id = ? AND created_at >= ? AND payment_status NOT IN ('pending','expired')`,
    ).all(tenant.id, dayStart);
    const CANCELLED = new Set(['rejected', 'auto_cancelled', 'cancelled_by_client']);
    const counted = rows.filter((r) => !CANCELLED.has(r.status));
    const revenue = counted.reduce((s, r) => s + r.total_rub, 0);
    const count = counted.length;
    const hours = Array.from({ length: 24 }, () => 0);
    for (const r of counted) hours[localHour(tenant, r.created_at)]++;
    // Сколько всего человек пользуется ботом кофейни (уникальные клиенты).
    const clients = db.prepare('SELECT COUNT(*) n FROM clients WHERE tenant_id = ?').get(tenant.id).n;
    return json(res, 200, {
      revenue, count, avg: count ? Math.round(revenue / count) : 0,
      cancelled: rows.length - counted.length, hours, clients,
      // Владельцы смотрят на одни и те же данные — показываем, за какой
      // период и в каком поясе они посчитаны.
      since: dayStart, tz: (shopSchedule(tenant) || {}).tz || 'Europe/Moscow',
    });
  }

  // Владелец: текущие настройки кофейни (телефон, доставка).
  if (path === '/api/staff/settings' && method === 'GET') {
    if (!ADMIN_ROLES.includes(role)) return json(res, 403, { error: 'forbidden' });
    const paused = tenant.delivery_paused_until && tenant.delivery_paused_until > now();
    return json(res, 200, {
      phone: tenant.phone || '',
      deliveryEnabled: !!tenant.delivery_enabled,
      deliveryPausedUntil: paused ? tenant.delivery_paused_until : 0,
    });
  }

  // Владелец: телефон кофейни и постоянное вкл/выкл доставки.
  if (path === '/api/staff/settings' && method === 'POST') {
    if (!ADMIN_ROLES.includes(role)) return json(res, 403, { error: 'forbidden' });
    const b = await readBody(req);
    if (b.phone !== undefined) {
      db.prepare('UPDATE tenants SET phone = ? WHERE id = ?').run(String(b.phone).trim().slice(0, 32) || null, tenant.id);
    }
    if (b.deliveryEnabled !== undefined) {
      db.prepare('UPDATE tenants SET delivery_enabled = ? WHERE id = ?').run(b.deliveryEnabled ? 1 : 0, tenant.id);
    }
    return json(res, 200, { ok: true });
  }

  // Владелец: пауза доставки. minutes>0 — до now+minutes; until (мс) — до времени;
  // 0/отсутствие — снять паузу.
  if (path === '/api/staff/delivery-pause' && method === 'POST') {
    if (!ADMIN_ROLES.includes(role)) return json(res, 403, { error: 'forbidden' });
    const b = await readBody(req);
    let until = 0;
    if (Number(b.minutes) > 0) until = now() + Math.min(Number(b.minutes), 24 * 60) * 60_000;
    else if (Number(b.until) > now()) until = Number(b.until);
    db.prepare('UPDATE tenants SET delivery_paused_until = ? WHERE id = ?').run(until, tenant.id);
    return json(res, 200, { ok: true, deliveryPausedUntil: until });
  }

  // Владелец: изменить цену/название/доступность товара.
  if (path === '/api/staff/product' && method === 'POST') {
    if (!ADMIN_ROLES.includes(role)) return json(res, 403, { error: 'forbidden' });
    const b = await readBody(req);
    const p = db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?').get(String(b.productId), tenant.id);
    if (!p) return json(res, 404, { error: 'not_found' });
    const price = b.price !== undefined ? Math.max(0, Math.round(Number(b.price))) : p.price_rub;
    if (!Number.isFinite(price)) return json(res, 400, { error: 'bad_price', message: 'Некорректная цена' });
    const name = b.name !== undefined ? String(b.name).trim().slice(0, 120) : p.name;
    if (!name) return json(res, 400, { error: 'bad_name', message: 'Название не может быть пустым' });
    const available = b.available !== undefined ? (b.available ? 1 : 0) : p.available;
    db.prepare('UPDATE products SET price_rub = ?, name = ?, available = ? WHERE id = ? AND tenant_id = ?')
      .run(price, name, available, p.id, tenant.id);
    return json(res, 200, { ok: true });
  }

  // Поллинг обновлений: заказы, изменившиеся после since (мс).
  if (path === '/api/updates' && method === 'GET') {
    const since = Number(new URL(req.url, 'http://x').searchParams.get('since') || 0);
    let rows;
    if (STAFF_ROLES.includes(role)) {
      rows = db.prepare(
        `SELECT * FROM orders WHERE tenant_id = ? AND updated_at > ?
           AND payment_status NOT IN ('pending','expired')
         ORDER BY updated_at`,
      ).all(tenant.id, since);
      return json(res, 200, { serverTime: now(), orders: rows.map(orderStaff) });
    }
    rows = db.prepare(
      `SELECT * FROM orders WHERE tenant_id = ? AND tg_user_id = ? AND updated_at > ?
         AND payment_status NOT IN ('pending','expired')
       ORDER BY updated_at`,
    ).all(tenant.id, String(user.id), since);
    return json(res, 200, { serverTime: now(), orders: rows.map(orderPublic) });
  }

  return json(res, 404, { error: 'unknown_endpoint' });
}

// ---------- /api/admin/* (супер-админ платформы) ----------
async function adminRoutes(req, res, path, method) {
  if (!config.adminSecret || req.headers['x-admin-secret'] !== config.adminSecret) {
    return json(res, 401, { error: 'admin_unauthorized' });
  }

  // Список кофеен.
  if (path === '/api/admin/tenants' && method === 'GET') {
    const rows = db.prepare('SELECT id, slug, name, bot_username, status, created_at FROM tenants ORDER BY created_at').all();
    return json(res, 200, { tenants: rows });
  }

  // Создать кофейню (+ владельца) и подключить её бота.
  if (path === '/api/admin/tenants' && method === 'POST') {
    const b = await readBody(req);
    if (!b.slug || !b.name || !b.botToken) return json(res, 400, { error: 'need_slug_name_token' });
    if (db.prepare('SELECT id FROM tenants WHERE slug = ?').get(b.slug)) return json(res, 409, { error: 'slug_taken' });

    const me = await getMe(b.botToken);
    if (!me.ok) return json(res, 400, { error: 'bad_bot_token', description: me.description });

    const id = uid();
    const secret = crypto.randomBytes(16).toString('hex');
    db.prepare(
      `INSERT INTO tenants (id, slug, name, bot_token, bot_username, webhook_secret, delivery_enabled, delivery_note, primary_color, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, b.slug, b.name, b.botToken, me.result.username, secret,
      b.deliveryEnabled === false ? 0 : 1, b.deliveryNote || 'Доставляем только в апартаменты нашего здания.',
      b.primaryColor || '#F0692B', now());

    if (b.ownerTgId) {
      db.prepare('INSERT INTO staff (id, tenant_id, tg_user_id, role, name) VALUES (?,?,?,?,?)')
        .run(uid(), id, String(b.ownerTgId), 'owner', b.ownerName || 'Владелец');
    }

    // Ставим вебхук боту, если известен внешний адрес.
    let webhook = null;
    if (config.publicUrl) {
      webhook = await setWebhook(b.botToken, `${config.publicUrl}/tg/${id}`, secret);
    }
    const webAppUrl = webAppBase ? `${webAppBase}/?t=${b.slug}` : null;
    return json(res, 201, {
      tenant: { id, slug: b.slug, name: b.name, botUsername: me.result.username },
      webAppUrl, webhook,
      hint: 'В @BotFather задайте Menu Button на webAppUrl. Сотрудников добавляйте через админку/сид.',
    });
  }

  // Быстро добавить сотрудника кофейне.
  if (path === '/api/admin/staff' && method === 'POST') {
    const b = await readBody(req);
    const t = db.prepare('SELECT id FROM tenants WHERE slug = ?').get(b.slug);
    if (!t) return json(res, 404, { error: 'tenant_not_found' });
    db.prepare(
      `INSERT INTO staff (id, tenant_id, tg_user_id, role, name) VALUES (?,?,?,?,?)
       ON CONFLICT(tenant_id, tg_user_id) DO UPDATE SET role = excluded.role, active = 1`,
    ).run(uid(), t.id, String(b.tgUserId), STAFF_ROLES.includes(b.role) ? b.role : 'barista', b.name || null);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'unknown_admin_endpoint' });
}

// ---------- Обработка апдейтов бота ----------
/**
 * Уведомление от ЮKassa. Телу уведомления не доверяем: берём из него только
 * id платежа, а статус перезапрашиваем у ЮKassa — так подделать оплату нельзя.
 */
async function handleYooKassaNotification(tenant, note) {
  const obj = note && note.object;
  const paymentId = obj && obj.id;
  if (!paymentId) return;

  const check = await getPayment(tenant, paymentId);
  if (!check.ok) { console.error('[yookassa] getPayment failed:', check.error); return; }

  // Заказ ищем по сохранённому payment_id, метаданные — как запасной вариант.
  const orderId = (check.data.metadata && check.data.metadata.orderId) || null;
  const o = db.prepare('SELECT * FROM orders WHERE tenant_id = ? AND (payment_id = ? OR id = ?)')
    .get(tenant.id, paymentId, orderId || '');
  if (!o) { console.error('[yookassa] order not found for payment', paymentId); return; }

  if (check.status === 'succeeded' && check.paid) {
    await markOrderPaid(tenant, o);
  } else if (check.status === 'canceled' && o.payment_status === 'pending') {
    db.prepare("UPDATE orders SET payment_status = 'expired', status = 'auto_cancelled', updated_at = ? WHERE id = ?")
      .run(now(), o.id);
  }
}

async function handleBotUpdate(tenant, update) {
  // 1) Подтверждение оплаты перед списанием — ответить в течение 10 сек.
  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    const orderId = String(q.invoice_payload || '').startsWith('order:') ? q.invoice_payload.slice(6) : null;
    const o = orderId ? db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(orderId, tenant.id) : null;
    const ok = !!o && o.payment_status === 'pending' && o.total_rub * 100 === q.total_amount;
    const why = !o ? 'Заказ не найден'
      : o.payment_status === 'paid' ? 'Заказ уже оплачен'
      : o.payment_status === 'expired' ? `Счёт устарел (действует ${PENDING_TTL_MIN} мин). Оформите заказ заново`
      : 'Сумма заказа изменилась. Оформите заказ заново';
    await answerPreCheckoutQuery(tenant.bot_token, q.id, ok, ok ? undefined : why);
    return;
  }

  const msg = update.message;
  if (!msg) return;

  // 2) Успешная оплата — отмечаем заказ оплаченным и уведомляем персонал.
  if (msg.successful_payment) {
    const payload = String(msg.successful_payment.invoice_payload || '');
    const orderId = payload.startsWith('order:') ? payload.slice(6) : null;
    const o = orderId ? db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(orderId, tenant.id) : null;
    await markOrderPaid(tenant, o);
    return;
  }

  if (!msg.text) return;
  if (msg.text.startsWith('/start')) {
    const url = webAppBase ? `${webAppBase}/?t=${tenant.slug}` : null;
    const kb = url ? webAppButton('Открыть меню', url) : undefined;
    await sendMessage(tenant.bot_token, msg.chat.id,
      `Добро пожаловать в «${tenant.name}» ☕\nОткройте мини-приложение, чтобы сделать заказ без очереди.`, kb);
  }
}

// ---------- Старт ----------
async function bootstrap() {
  seedDemo();
  server.listen(config.port, () => {
    console.log(`[server] listening on :${config.port}`);
    console.log(`[server] webDir: ${config.webDir}`);
    console.log(`[server] dataDir: ${config.dataDir}`);
    console.log(`[server] publicUrl: ${config.publicUrl || '(not set — webhooks disabled)'}`);
    console.log(`[server] webAppBase: ${webAppBase || '(not set)'}`);
    // Диагностика оплаты: секреты не печатаем, только сам факт их наличия.
    for (const t of db.prepare('SELECT id, slug, payment_mode, payment_provider_token, yk_shop_id, yk_secret_key, webhook_secret, bot_username FROM tenants').all()) {
      const yk = t.yk_shop_id && t.yk_secret_key;
      const way = yk ? 'ЮKassa по ссылке (карта + СБП)'
        : t.payment_provider_token ? 'шторка Telegram'
        : 'на кассе';
      console.log(`[payments] ${t.slug}: mode=${t.payment_mode}, способ=${way}`);
      if (yk) {
        console.log(`[payments] ${t.slug}: чек 54-ФЗ=${config.receiptEnabled ? `да (НДС код ${config.receiptVatCode})` : 'выключен'}`
          + `, бот для возврата=${t.bot_username ? '@' + t.bot_username : 'НЕ ЗАДАН (TELEGRAM_BOT_USERNAME)'}`);
      }
      if (yk && config.publicUrl) {
        console.log(`[payments] ${t.slug}: вебхук для ЮKassa → ${config.publicUrl}/yk/${t.id}/${t.webhook_secret}`);
      }
    }
    // Кто может работать за стойкой. Пусто — значит SEED_*_TG_ID не заданы и
    // ленту бариста никто не увидит.
    const staff = db.prepare("SELECT role, tg_user_id FROM staff WHERE active = 1 ORDER BY role").all();
    console.log(staff.length
      ? `[staff] ${staff.map((s) => `${s.role}=${s.tg_user_id}`).join(', ')}`
      : '[staff] НИКОГО — задайте SEED_OWNER_TG_ID / SEED_BARISTA_TG_ID');
    const orders = db.prepare('SELECT COUNT(*) n FROM orders').get().n;
    console.log(`[orders] в базе заказов: ${orders}`);
    const pack = db.prepare('SELECT packaging_fee_rub p FROM tenants LIMIT 1').get();
    console.log(`[menu] наценка за упаковку: ${pack ? pack.p : 0} ₽ (переменная SEED_PACKAGING_FEE)`);
    for (const t of db.prepare('SELECT slug, hours_json FROM tenants').all()) {
      const sch = shopSchedule(t);
      if (!sch) { console.log(`[hours] ${t.slug}: круглосуточно (расписание не задано)`); continue; }
      const win = (w) => (w ? `${w[0]}–${w[1]}` : 'выходной');
      const st = shopStatus(t);
      console.log(`[hours] ${t.slug}: будни ${win(sch.days[0])}, выходные ${win(sch.days[5])} (${sch.tz})`);
      console.log(`[hours] ${t.slug}: сейчас ${st.open ? `открыто до ${st.closesAt} · доставка до ${st.lastDelivery}, самовывоз до ${st.lastPickup}` : `закрыто, откроется в ${st.opensAt}`}`);
    }
  });

  // Брошенные счета гасим и в фоне: клиент может больше не открыть приложение,
  // а заказ не должен вечно висеть неоплаченным. Но сперва — сверка с ЮKassa:
  // вдруг «брошенный» на деле оплачен. Сверка идёт первой, чтобы такой заказ
  // был проведён, а не погашен.
  const sweep = async () => {
    try { await reconcilePendingOrders(); }
    catch (e) { console.error('[reconcile]', e && e.message); }
    const n = expirePendingOrders();
    if (n) console.log(`[orders] погашено брошенных счетов (без ЮKassa): ${n}`);
  };
  // На старте — сразу: восстановит заказ, оплаченный, но потерянный до перезапуска.
  sweep();
  setInterval(sweep, 2 * 60_000).unref();

  // Автоустановка вебхуков всем ботам (если известен внешний адрес).
  if (config.autoSetWebhooks && config.publicUrl) {
    const tenants = db.prepare("SELECT id, bot_token, webhook_secret FROM tenants WHERE bot_token != ''").all();
    for (const t of tenants) {
      const r = await setWebhook(t.bot_token, `${config.publicUrl}/tg/${t.id}`, t.webhook_secret);
      console.log(`[webhook] tenant ${t.id}: ${r.ok ? 'ok' : r.description}`);
    }
  }
}
bootstrap();
