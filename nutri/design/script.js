/* ============================================================
   Любовь-Марковь — мини-приложение (клиент / бариста / владелец)

   Два режима работы одного и того же кода:
   - DEMO  — открыто вне Telegram (например, для показа макета): данные
             в памяти, переключатель ролей виден, ничего не сохраняется.
   - LIVE  — открыто внутри Telegram: initData подписан ботом кофейни,
             все данные и действия идут через реальный бэкенд (см.
             nutri/server), роль определяется сервером по Telegram id.
   ============================================================ */

// ---------- Рисованная графика (SVG) ----------
function logoMark() {
    return `<svg class="mark" viewBox="58 28 168 120" fill="none" stroke="currentColor"
        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M66 133 C104 140 150 140 168 132" stroke-width="1.3" opacity="0.5"/>
        <path d="M70 131 C63 104 72 74 92 74 C108 74 114 100 110 126 C109 130 105 132 100 132 L77 132 C73 132 70 132 70 131 Z"/>
        <circle cx="90" cy="53" r="14.5"/>
        <path d="M77 98 C88 92 101 95 107 104" stroke-width="1.4" opacity="0.6"/>
        <path d="M104 129 C99 104 108 76 125 78 C143 80 153 104 153 124 C153 130 149 132 142 132 L110 132 C106 132 104 131 104 129 Z"/>
        <circle cx="121" cy="59" r="12.5"/>
        <path d="M111 52 C113 48 117 47 121 48" stroke-width="1.3" opacity="0.6"/>
        <path d="M120 96 C120 110 119 122 119 131" stroke-width="1.2" opacity="0.4"/>
        <path d="M136 96 C138 110 140 122 140 131" stroke-width="1.2" opacity="0.4"/>
        <path d="M100 70 C115 60 132 64 140 79"/>
        <path d="M140 79 l-4 4 M140 79 l0 5 M140 79 l5 2" stroke-width="1.6"/>
        <path d="M84 132 l-6 4 M122 132 l6 4 M104 132 l1 5" stroke-width="1.7"/>
        <path d="M156 40 C154 33 145 33 145 41 C145 49 156 55 156 55 C156 55 167 49 167 41 C167 33 158 33 156 40 Z" stroke-width="1.7"/>
        <ellipse cx="192" cy="96" rx="12" ry="3.2"/>
        <path d="M180 96 C180 110 204 110 204 96"/>
        <path d="M204 99 C212 99 212 107 203 106"/>
        <path d="M173 114 C176 118 208 118 211 114"/>
        <path d="M185 90 C183 84 189 81 187 75" stroke-width="1.5"/>
        <path d="M195 90 C193 84 199 81 197 75" stroke-width="1.5"/>
    </svg>`;
}
function cupArt() {
    return `<svg width="72" height="60" viewBox="0 0 58 50" fill="none" stroke="currentColor"
        stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 19 H41 V27 C41 36 34 42 26 42 C18 42 11 36 11 27 Z"/>
        <path d="M41 23 C49 23 49 35 41 34"/>
        <path d="M19 5 C17 8 21 10 19 13 M26 4 C24 7 28 9 26 12 M33 5 C31 8 35 10 33 13" stroke-width="2.6"/>
    </svg>`;
}
function engravingCup() {
    return `<svg width="70" height="66" viewBox="0 0 64 60" fill="none" stroke="currentColor"
        stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 22 H44 V31 C44 41 36 48 28 48 C20 48 12 41 12 31 Z"/>
        <path d="M44 26 C53 26 53 39 44 38"/>
        <path d="M8 52 C16 56 40 56 48 52"/>
        <path d="M20 5 C18 9 22 11 20 15 M28 4 C26 8 30 10 28 14 M36 5 C34 9 38 11 36 15" stroke-width="2.8"/>
    </svg>`;
}
const IC = {
    book: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 12h6"/></svg>`,
    pin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
    crown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l3 9h10l3-9-5 4-3-6-3 6z"/></svg>`,
    apron: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4a3 3 0 0 0 6 0"/><path d="M8 5C5 6 5 9 7 11l-1 8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l-1-8c2-2 2-5-1-6"/></svg>`,
    bag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>`,
    warn: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4M12 17.5h.01"/></svg>`,
    home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/></svg>`,
    phone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>`,
};

// ============================================================
//  Подключение к бэкенду (LIVE-режим внутри Telegram)
// ============================================================
const tg = window.Telegram && window.Telegram.WebApp;
const CFG = window.LM_CONFIG || {};
const API_BASE = (CFG.apiBase || '').replace(/\/$/, '');
const TENANT = new URLSearchParams(location.search).get('t') || CFG.tenant || '';
let LIVE = false;   // true после успешной авторизации через бэкенд
let ROLE = 'client';

async function api(path, method, body) {
    try {
        // Ответы API кешировать нельзя: WebView Telegram умеет отдать из кеша
        // старый /api/bootstrap, и приложение соберёт заказ по меню прошлого
        // поколения базы. Заголовка no-store некоторым клиентам мало, поэтому
        // GET-запросы дополнительно разводим уникальным параметром.
        const url = API_BASE + path + ((method || 'GET') === 'GET'
            ? (path.includes('?') ? '&' : '?') + '_=' + Date.now()
            : '');
        const res = await fetch(url, {
            method: method || 'GET',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant': TENANT,
                'X-Init-Data': tg ? tg.initData : '',
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => null);
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        return { ok: false, status: 0, data: null, networkError: true };
    }
}

// ============================================================
//  Меню: демо-данные (превью вне Telegram) + генерик-модификаторы
// ============================================================
// Любая категория из бэкенда сводится к одному из трёх визуальных
// стилей карточки (цвет-градиент + иконка) по ключевым словам названия.
function catKeyFor(name) {
    const n = (name || '').toLowerCase();
    if (/десерт|вафл|сладк|чизкейк|пирож/.test(n)) return 'dessert';
    if (/спешл|не кофе|чай|напит|еда|лимонад|смузи/.test(n)) return 'special';
    return 'coffee';   // кофе, авторский кофе, холодный кофе и пр.
}
// Иконки для чипов-категорий (по визуальному стилю).
const CAT_CHIP_ICON = {
    all: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h11M19 8h1M4 16h5M13 16h7"/><circle cx="16" cy="8" r="2.4"/><circle cx="10" cy="16" r="2.4"/></svg>`,
    coffee: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"/><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M8 3v2M12 3v2"/></svg>`,
    special: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16z"/><path d="M9 15c3-3 6-4 8-4"/></svg>`,
    dessert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20h16v-7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3z"/><path d="M4 15c2 1.5 3 1.5 5 0s3-1.5 5 0 3 1.5 6 0"/><path d="M12 4v3"/></svg>`,
};
let CATEGORIES_LIST = [];   // упорядоченные названия категорий, присутствующих в меню

// Группы модификаторов для напитков в демо-режиме — по той же форме,
// что отдаёт бэкенд (groups[].options[]), чтобы шторка товара была одна на оба режима.
const GROUPS_DRINK = [
    { id: 'size', name: 'Размер', required: true, options: [
        { id: 's', name: 'S · 250 мл', priceDelta: 0, isDefault: true },
        { id: 'm', name: 'M · 350 мл', priceDelta: 40, isDefault: false },
        { id: 'l', name: 'L · 450 мл', priceDelta: 70, isDefault: false },
    ] },
    { id: 'milk', name: 'Молоко', required: false, options: [
        { id: 'reg', name: 'Обычное', priceDelta: 0, isDefault: true },
        { id: 'oat', name: 'Растительное', priceDelta: 50, isDefault: false },
        { id: 'banana', name: 'Банановое', priceDelta: 60, isDefault: false },
    ] },
];
const DEMO_SEED = [
    ['Капучино', 220, 'Кофе', true, 'Эспрессо с бархатистой молочной пеной.'],
    ['Латте', 240, 'Кофе', true, 'Много молока, немного эспрессо — нежный вкус.'],
    ['Американо', 180, 'Кофе', true, 'Классический чёрный кофе. Насыщенный и бодрящий.'],
    ['Флэт-уайт', 260, 'Кофе', true, 'Двойной эспрессо с тонким слоем молока.'],
    ['Раф ванильный', 280, 'Кофе', true, 'Эспрессо со сливками и ванилью.'],
    ['Эспрессо', 130, 'Кофе', true, 'Концентрированный кофе, основа всех напитков.'],
    ['Матча-латте', 320, 'Спешлти', true, 'Японская матча с молоком.'],
    ['Фильтр V60', 260, 'Спешлти', true, 'Альтернативная заварка, раскрывает вкус зерна.'],
    ['Бамбл', 290, 'Спешлти', true, 'Эспрессо на апельсиновом соке со льдом.'],
    ['Какао', 240, 'Спешлти', true, 'Горячее какао на молоке.'],
    ['Морковный торт', 260, 'Десерты', false, 'Влажный бисквит со специями и кремом.', 'img/napoleon.jpg'],
    ['Чизкейк', 290, 'Десерты', false, 'Нежный сливочный чизкейк.', 'img/kapkeik.jpg'],
    ['Круассан', 180, 'Десерты', false, 'Свежая слоёная выпечка.'],
];
function demoProducts() {
    return DEMO_SEED.map(([name, price, categoryName, hasGroups, description, photo_url = null], i) => ({
        id: 'demo-' + i, name, price, available: true, categoryName, description, photo_url,
        catKey: catKeyFor(categoryName),
        groups: hasGroups ? GROUPS_DRINK : [],
    }));
}

// ---------- Состояние ----------
let MENU = [];                 // текущее меню (демо-сид либо ответ бэкенда)
let activeCat = 'all';         // 'all' либо имя категории
let query = '';
let cart = {};                   // key -> { productId, name, catKey, mods, unit, qty, optionIds:[] }
let fulfillment = 'pickup';      // 'pickup' | 'delivery'
let DELIVERY_FEE = 50;           // наценка за доставку (₽), приходит из bootstrap
let PACKAGING_FEE = 0;           // наценка за упаковку (₽), приходит из bootstrap
let PAYMENT_ONLINE = false;      // true — оплата картой в приложении (из bootstrap)
let PAY_BY_LINK = false;         // true — оплата по ссылке в браузере (ЮKassa: карта + СБП)
let NEED_EMAIL = true;           // нужен ли e-mail (только при облачной кассе)
let HOURS = null;                // режим работы кофейни (из bootstrap)
let MODIFIER_GROUPS = [];        // добавки для экрана стоп-листа (только персоналу)
let PHONE = '';                  // телефон кофейни (кнопка «Позвонить»)
let DELIVERY_ENABLED = true;     // доставка включена и не на паузе
let payEmail = '';               // e-mail для кассового чека (запоминаем между заказами)
let orderComment = '';           // комментарий клиента к текущему заказу
const delivery = { entrance: '', floor: '', apt: '' };
let baristaFilter = 'active';

function findProduct(id) { return MENU.find((p) => p.id === id); }
function setFulfil(mode) {
    if (mode === 'delivery') {
        if (!DELIVERY_ENABLED) { toast('Доставка сейчас недоступна'); return; }
        if (!shopStatus().delivery) { toast(`Доставку принимаем до ${shopStatus().lastDelivery}`); return; }
    }
    fulfillment = mode; saveCart(); renderCart();
}
function setDeliveryField(field, val) { delivery[field] = val; saveCart(); }
// Комментарий не перерисовывает корзину — иначе поле теряет фокус на каждом символе.
function setOrderComment(val) { orderComment = val; saveCart(); }
// E-mail не перерисовывает корзину: иначе поле теряет фокус на каждом символе.
function setPayEmail(val) {
    payEmail = val;
    const s = storage();
    if (s) { try { s.setItem(EMAIL_KEY, val); } catch { /* не критично */ } }
}
function emailValid(v) { return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(String(v || '').trim()); }

// ============================================================
//  Корзина переживает закрытие мини-приложения
// ============================================================
// Telegram выгружает WebView при сворачивании, поэтому корзина в памяти
// пропадала вместе с ней. Держим её в localStorage: ключ на кофейню и на
// пользователя, чтобы на общем устройстве заказы не смешивались.
let CART_KEY = 'lm:cart:v2:anon';
// E-mail для чека живёт отдельным ключом: корзина после оплаты чистится, а
// адрес должен остаться — иначе клиент печатает его перед каждым заказом.
let EMAIL_KEY = 'lm:email:v1:anon';
const CART_TTL_MS = 12 * 60 * 60 * 1000;   // сутки спустя корзина уже неактуальна

function storage() {
    // Приватный режим и старые WebView умеют бросать на самом обращении.
    try { return window.localStorage; } catch { return null; }
}
function saveCart() {
    const s = storage();
    if (!s) return;
    try {
        s.setItem(CART_KEY, JSON.stringify({
            at: Date.now(),
            fulfillment,
            delivery,
            comment: orderComment,
            lines: Object.values(cart).map((v) => ({ productId: v.productId, optionIds: v.optionIds, qty: v.qty })),
        }));
    } catch { /* переполнение квоты — корзина просто не переживёт перезапуск */ }
}
function clearCart() {
    cart = {};
    fulfillment = 'pickup';
    delivery.entrance = delivery.floor = delivery.apt = '';
    orderComment = '';
    const s = storage();
    if (!s) return;
    // Чистим не только текущий ключ, но и все корзины прошлых схем (раньше ключ
    // был без id пользователя). Иначе устаревшая корзина под старым ключом
    // всплывала снова и снова с несовместимыми id позиций.
    try {
        s.removeItem(CART_KEY);
        const kill = [];
        for (let i = 0; i < s.length; i++) {
            const k = s.key(i);
            if (k && k.startsWith('lm:cart:')) kill.push(k);
        }
        kill.forEach((k) => s.removeItem(k));
    } catch { /* не критично */ }
}
// Восстановление собираем заново по актуальному меню: товар мог уехать в
// стоп-лист или сменить цену, пока приложение было закрыто.
function selectionFromOptionIds(product, optionIds) {
    const ids = new Set(optionIds || []);
    const sel = {};
    for (const g of product.groups) {
        const matching = g.options.filter((o) => ids.has(o.id)).map((o) => o.id);
        if (matching.length) sel[g.id] = matching;
    }
    return sel;
}
function restoreCart() {
    const s = storage();
    if (!s) return;
    try { payEmail = s.getItem(EMAIL_KEY) || ''; } catch { /* приватный режим */ }
    let saved;
    try { saved = JSON.parse(s.getItem(CART_KEY) || 'null'); } catch { saved = null; }
    if (!saved || !Array.isArray(saved.lines)) return;
    if (!saved.at || Date.now() - saved.at > CART_TTL_MS) { try { s.removeItem(CART_KEY); } catch {} return; }

    let dropped = 0;
    for (const line of saved.lines) {
        const product = findProduct(line.productId);
        if (!product || product.available === false) { dropped++; continue; }
        const selected = selectionFromOptionIds(product, line.optionIds);
        // Опция могла уехать в стоп-лист, пока приложение было закрыто. Молча
        // вернуть позицию без неё нельзя: человек заказывал на кокосовом молоке,
        // а получил бы на обычном и по другой цене.
        const saved = Array.isArray(line.optionIds) ? line.optionIds : [];
        if (Object.values(selected).flat().length !== saved.length) { dropped++; continue; }
        const qty = Math.max(1, Math.min(50, Number(line.qty) || 1));
        const key = cartKey(product.id, selected);
        // Цену пересчитываем от текущего меню — иначе на кассе будет расхождение.
        cart[key] = {
            productId: product.id, name: product.name, catKey: product.catKey,
            mods: modsText(product, selected), unit: unitPrice(product, selected), qty,
            optionIds: Object.values(selected).flat(),
        };
    }
    if (saved.fulfillment === 'delivery') fulfillment = 'delivery';
    if (saved.delivery) {
        delivery.entrance = saved.delivery.entrance || '';
        delivery.floor = saved.delivery.floor || '';
        delivery.apt = saved.delivery.apt || '';
    }
    if (typeof saved.comment === 'string') orderComment = saved.comment;
    if (dropped) toast(dropped === 1 ? 'Одна позиция больше недоступна' : `${dropped} позиции больше недоступны`);
    saveCart();
}

const ACTIVE_STATUSES = ['created', 'accepted', 'preparing', 'ready'];
const STATUS_CLASS = {
    created: 'st-new', accepted: 'st-accepted', preparing: 'st-preparing', ready: 'st-ready',
    completed: 'st-done', rejected: 'st-rejected', auto_cancelled: 'st-rejected', cancelled_by_client: 'st-rejected',
};
const STATUS_TEXT = {
    created: 'Новый', accepted: 'Принят', preparing: 'Готовим', ready: 'Готов',
    completed: 'Выдан', rejected: 'Отклонён', auto_cancelled: 'Отменён', cancelled_by_client: 'Отменён',
};
// Переход статуса заказа у бариста: событие для API + подпись кнопки (демо просто ставит target локально).
const FLOW = {
    created: { event: 'accept', target: 'accepted', btn: 'Принять', cls: 'btn-primary' },
    accepted: { event: 'start_preparing', target: 'preparing', btn: 'Начать готовить', cls: 'btn-advance' },
    preparing: { event: 'mark_ready', target: 'ready', btn: 'Заказ готов', cls: 'btn-advance' },
    ready: { event: 'complete', target: 'completed', btn: 'Выдать', cls: 'btn-ready' },
};
const money = (n) => n.toLocaleString('ru-RU') + ' ₽';
const fmtTime = (ms) => new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (ms) => new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ', ' + fmtTime(ms);

// Демо-история клиента и лента бариста — тот же формат объектов, что и от бэкенда.
let clientOrders = [
    { id: 'demo-h1', number: 'А-3', status: 'completed', statusLabel: 'Выдан', fulfillment: 'pickup', address: '',
      total: 220, items: [{ qty: 1, name: 'Капучино', mods: '' }], createdAt: new Date(2026, 7, 14, 22, 1).getTime() },
    { id: 'demo-h2', number: 'А-2', status: 'completed', statusLabel: 'Выдан', fulfillment: 'pickup', address: '',
      total: 500, items: [{ qty: 1, name: 'Латте', mods: '' }, { qty: 1, name: 'Морковный торт', mods: '' }],
      createdAt: new Date(2026, 7, 12, 9, 14).getTime() },
];
let baristaOrders = [
    { id: 'А-7', number: 'А-7', ts: '09:41', customer: 'Аня', status: 'created', statusLabel: 'Новый',
      fulfillment: 'delivery', address: 'Подъезд 2, этаж 5, апарт. 512', total: 480,
      items: [{ qty: 1, name: 'Капучино', mods: 'M · растит. молоко' }, { qty: 1, name: 'Морковный торт', mods: '' }] },
    { id: 'А-6', number: 'А-6', ts: '09:37', customer: 'Игорь', status: 'preparing', statusLabel: 'Готовим',
      fulfillment: 'pickup', address: '', total: 360, items: [{ qty: 2, name: 'Американо', mods: 'L' }] },
    { id: 'А-5', number: 'А-5', ts: '09:33', customer: 'Лена', status: 'ready', statusLabel: 'Готов',
      fulfillment: 'delivery', address: 'Подъезд 1, этаж 8, апарт. 803', total: 460,
      items: [{ qty: 1, name: 'Раф ванильный', mods: 'M' }, { qty: 1, name: 'Круассан', mods: '' }] },
    { id: 'А-4', number: 'А-4', ts: '09:20', customer: 'Пётр', status: 'completed', statusLabel: 'Выдан',
      fulfillment: 'pickup', address: '', total: 130, items: [{ qty: 1, name: 'Эспрессо', mods: '' }] },
];

// ============================================================
//  Навигация
// ============================================================
function switchRole(role) {
    document.querySelectorAll('.role-app').forEach((el) => el.classList.remove('active'));
    document.getElementById('role-' + role).classList.add('active');
    document.querySelectorAll('.role-switch button').forEach((b) => b.classList.remove('active'));
    const btn = document.getElementById('rs-' + role);
    if (btn) btn.classList.add('active');
}
function switchTab(role, tab) {
    const app = document.getElementById('role-' + role);
    app.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    app.querySelector('#view-' + role + '-' + tab).classList.add('active');
    app.querySelectorAll('.tab').forEach((n) => n.classList.remove('active'));
    app.querySelector('#tab-' + role + '-' + tab).classList.add('active');
    // Всегда обновляем открываемую вкладку — данные должны быть свежими.
    if (role === 'client' && tab === 'menu') renderMenu();
    else if (role === 'client' && tab === 'cart') renderCart();
    else if (role === 'client' && tab === 'orders') { LIVE ? loadClientOrders() : renderClientOrders(); }
    else if (role === 'barista' && (tab === 'feed' || tab === 'archive')) { LIVE ? loadBaristaOrders().then(renderBarista) : renderBarista(); }
    else if (role === 'barista' && tab === 'stop') renderStopList();
    else if (role === 'owner' && tab === 'menu') renderOwnerMenu();
    else if (role === 'owner' && tab === 'summary') { loadOwnerSummary(); loadOwnerSettings(); }
    else if (role === 'owner' && tab === 'team') loadOwnerTeam();
}

// ============================================================
//  Режим работы
// ============================================================
// Зеркало серверной shopStatus (nutri/server/src/domain.js). Считаем на
// клиенте, чтобы статус оставался живым, пока приложение открыто, — но
// последнее слово всё равно за сервером при оформлении заказа.
const WEEKDAY_IDX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const hhmmToMin = (v) => {
    const [h, m] = String(v || '').split(':').map(Number);
    return (isFinite(h) ? h : 0) * 60 + (isFinite(m) ? m : 0);
};
const minToHhmm = (m) => {
    const x = ((Math.round(m) % 1440) + 1440) % 1440;
    return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};
function shopStatus(at) {
    const sch = HOURS;
    if (!sch || !Array.isArray(sch.days) || sch.days.length !== 7) return { open: true, pickup: true, delivery: true };
    let dayIdx = 0, min = 0;
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: sch.tz || 'Europe/Moscow', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(new Date(at || Date.now()));
        const get = (t) => (parts.find((x) => x.type === t) || {}).value;
        dayIdx = WEEKDAY_IDX[get('weekday')] || 0;
        min = Number(get('hour')) * 60 + Number(get('minute'));
    } catch {
        return { open: true, pickup: true, delivery: true };   // старый WebView без Intl
    }
    const lead = sch.lastOrderMin || {};
    const leadDelivery = Number(lead.delivery != null ? lead.delivery : 60);
    const leadPickup = Number(lead.pickup != null ? lead.pickup : 30);

    const windows = [];
    for (let d = -1; d <= 7; d++) {
        const w = sch.days[(((dayIdx + d) % 7) + 7) % 7];
        if (!Array.isArray(w) || !w[0] || !w[1]) continue;
        const open = d * 1440 + hhmmToMin(w[0]);
        let close = d * 1440 + hhmmToMin(w[1]);
        if (close <= open) close += 1440;
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
    };
}
// Расписание одной строкой — для подписи «Работаем …».
function hoursText() {
    if (!HOURS || !Array.isArray(HOURS.days)) return '';
    const w = (d) => (d ? `${d[0]}–${d[1]}` : 'выходной');
    const wd = w(HOURS.days[0]), we = w(HOURS.days[5]);
    return wd === we ? `Ежедневно ${wd}` : `Будни ${wd} · выходные ${we}`;
}

// ============================================================
//  Клиент: меню
// ============================================================
// Собираем ленту категорий из реального меню (а не хардкод 4 штук).
function renderCategories() {
    const wrap = document.getElementById('categories');
    if (!wrap) return;
    const chips = [`<button class="cat-btn ${activeCat === 'all' ? 'active' : ''}" onclick="setCat(this,'all')">${CAT_CHIP_ICON.all}Всё</button>`];
    for (const name of CATEGORIES_LIST) {
        const k = catKeyFor(name);
        const safe = name.replace(/'/g, '&#39;');
        chips.push(`<button class="cat-btn ${activeCat === name ? 'active' : ''}" onclick="setCat(this,'${safe}')">${CAT_CHIP_ICON[k]}${name}</button>`);
    }
    wrap.innerHTML = chips.join('');
}

function renderClosedBanner() {
    const el = document.getElementById('shop-banner');
    if (!el) return;
    const st = shopStatus();
    if (st.open && st.pickup) { el.className = 'shop-banner'; el.innerHTML = ''; return; }
    const text = !st.open
        ? `Сейчас закрыто${st.opensAt ? ` · откроемся в ${st.opensAt}` : ''}. ${hoursText()}`
        : `Приём заказов на сегодня закрыт${st.closesAt ? ` · работаем до ${st.closesAt}` : ''}`;
    el.className = 'shop-banner show';
    el.innerHTML = `${IC.warn}<span>${text}</span>`;
}

function renderMenu(opts) {
    renderClosedBanner();
    const stagger = !opts || opts.stagger !== false;
    const grid = document.getElementById('menu-grid');
    const q = query.trim().toLowerCase();
    const items = MENU.filter((p) =>
        (activeCat === 'all' || p.categoryName === activeCat) && (!q || p.name.toLowerCase().includes(q)));
    // Доступные позиции — вверх, из стоп-листа — вниз (порядок внутри групп
    // сохраняется: Array.sort стабилен).
    items.sort((a, b) => Number(b.available) - Number(a.available));
    if (!items.length) { grid.innerHTML = '<div class="empty-note" style="grid-column:1/-1">Ничего не найдено</div>'; return; }
    grid.innerHTML = items.map((p, i) => {
        const out = !p.available;
        const open = out ? '' : `onclick="openSheet('${p.id}')"`;
        const enter = stagger ? `card-enter" style="animation-delay:${Math.min(i * 0.03, 0.4)}s` : '';
        const desc = p.description ? `<p class="card-desc">${p.description}</p>` : '';
        return `
        <article class="menu-card ${out ? 'sold-out' : ''} ${enter}">
            <div class="card-img ${p.photo_url ? '' : `cat-${p.catKey}`}" ${open}>${p.photo_url ? `<img class="card-photo" src="${p.photo_url}" alt="${p.name}" loading="lazy">` : cupArt()}</div>
            <div class="card-body" ${open}>
                <h2 class="card-title">${p.name}</h2>
                ${desc}
                <span class="card-price">${money(p.price)}</span>
                ${out ? '<span class="card-soldout">Стоп</span>'
                      : `<button class="add-btn" onclick="event.stopPropagation();addSimple('${p.id}')" aria-label="Добавить ${p.name}">+</button>`}
            </div>
        </article>`;
    }).join('');
}
function setCat(btn, catName) {
    activeCat = catName;
    btn.parentElement.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderMenu({ stagger: true });
}
let searchTimer;
function setSearch(v) {
    query = v;
    clearTimeout(searchTimer);
    // Дебаунс: не перестраиваем всю сетку на каждое нажатие — иначе лагает.
    searchTimer = setTimeout(() => renderMenu({ stagger: false }), 110);
}

// ============================================================
//  Клиент: карточка товара (нижняя шторка с модификаторами)
// ============================================================
let sheet = null;   // { product, selected: {groupId: optionId}, qty }

// selected всегда хранит массив id: { [groupId]: string[] }
// Для группы с maxSelect=1 — не более одного элемента.
function defaultSelection(product) {
    const sel = {};
    for (const g of product.groups) {
        const def = g.options.find((o) => o.isDefault);
        if (def) { sel[g.id] = [def.id]; continue; }
        if (g.required && g.options[0]) sel[g.id] = [g.options[0].id];
    }
    return sel;
}
function unitPrice(product, selected) {
    let unit = product.price;
    for (const g of product.groups) {
        const ids = selected[g.id] || [];
        for (const oid of ids) {
            const opt = g.options.find((o) => o.id === oid);
            if (opt) unit += opt.priceDelta;
        }
    }
    return unit;
}
function modsText(product, selected) {
    const parts = [];
    product.groups.forEach((g, i) => {
        const ids = selected[g.id] || [];
        const opts = g.options.filter((o) => ids.includes(o.id));
        if (!opts.length) return;
        if (i === 0) {
            parts.push(opts[0].name.split(' · ')[0]);
        } else {
            const nonDefault = opts.filter((o) => !o.isDefault);
            if (nonDefault.length) parts.push(nonDefault.map((o) => o.name.toLowerCase()).join(', '));
        }
    });
    return parts.join(' · ');
}
function openSheet(productId) {
    const product = findProduct(productId);
    if (!product) return;
    sheet = { product, selected: defaultSelection(product), qty: 1 };
    renderSheet();
}
function closeSheet() {
    const el = document.getElementById('sheet');
    el.classList.remove('show');
    setTimeout(() => { el.innerHTML = ''; }, 260);
    sheet = null;
}
function selectOption(groupId, optionId) {
    const g = sheet.product.groups.find((x) => x.id === groupId);
    if (!g) return;
    const maxSel = g.maxSelect || 1;
    const cur = sheet.selected[groupId] || [];
    if (maxSel > 1) {
        // Мульти-выбор: тап добавляет/убирает опцию.
        if (cur.includes(optionId)) {
            sheet.selected[groupId] = cur.filter((id) => id !== optionId);
        } else if (cur.length < maxSel) {
            sheet.selected[groupId] = [...cur, optionId];
        }
    } else {
        // Одиночный выбор: повторный тап на необязательной группе снимает выбор.
        if (!g.required && cur.includes(optionId)) {
            sheet.selected[groupId] = [];
        } else {
            sheet.selected[groupId] = [optionId];
        }
    }
    renderSheet();
}
function sheetQty(d) { sheet.qty = Math.max(1, sheet.qty + d); renderSheet(); }
function renderSheet() {
    const { product, selected, qty } = sheet;
    const el = document.getElementById('sheet');
    const chips = (g) => g.options.map((o) => {
        const isOn = (selected[g.id] || []).includes(o.id);
        return `<button class="opt ${isOn ? 'on' : ''}" onclick="selectOption('${g.id}','${o.id}')">
            <span>${o.name}</span>${o.priceDelta ? `<b>+${o.priceDelta} ₽</b>` : ''}
        </button>`;
    }).join('');
    const unit = unitPrice(product, selected);
    el.innerHTML = `
        <div class="sheet-scrim" onclick="closeSheet()"></div>
        <div class="sheet-panel">
            <div class="sheet-grab"></div>
            <div class="sheet-head">
                <div class="sheet-thumb ${product.photo_url ? 'sheet-thumb-photo' : `cat-${product.catKey}`}">${product.photo_url ? `<img class="sheet-photo" src="${product.photo_url}" alt="${product.name}">` : cupArt()}</div>
                <div><div class="sheet-name">${product.name}</div><div class="sheet-base">${money(product.price)} · базовая</div></div>
                <button class="sheet-x" onclick="closeSheet()" aria-label="Закрыть">✕</button>
            </div>
            ${product.description ? `<p class="sheet-desc">${product.description}</p>` : ''}
            ${product.groups.length ? product.groups.map((g) => `
            <div class="opt-group"><div class="opt-label">${g.name}</div><div class="opts">${chips(g)}</div></div>`).join('')
            : '<div class="opt-note">Без дополнительных опций</div>'}
            <div class="sheet-foot">
                <div class="qty">
                    <button onclick="sheetQty(-1)" aria-label="Меньше">−</button>
                    <span>${qty}</span>
                    <button onclick="sheetQty(1)" aria-label="Больше">+</button>
                </div>
                <button class="main-btn" onclick="addConfigured()">Добавить · ${money(unit * qty)}</button>
            </div>
        </div>`;
    requestAnimationFrame(() => el.classList.add('show'));
}
function addConfigured() {
    const { product, selected, qty } = sheet;
    addLine(product, selected, qty);
    toast(product.name + ' — в корзине');
    closeSheet();
}

// ============================================================
//  Клиент: корзина
// ============================================================
function addSimple(productId) {
    const product = findProduct(productId);
    if (!product) return;
    addLine(product, defaultSelection(product), 1);
    toast(product.name + ' — в корзине');
}
function cartKey(productId, selected) { return productId + '|' + Object.values(selected).flat().sort().join(','); }
function addLine(product, selected, qty) {
    const key = cartKey(product.id, selected);
    if (cart[key]) cart[key].qty += qty;
    else cart[key] = {
        productId: product.id, name: product.name, catKey: product.catKey,
        mods: modsText(product, selected), unit: unitPrice(product, selected), qty,
        // selected — это {группа: [id, ...]}, поэтому обязательно flat():
        // без него на сервер уезжал массив массивов, и ни одна опция не
        // совпадала с меню («Недопустимая опция товара»).
        optionIds: Object.values(selected).flat(),
    };
    saveCart();
    updateCartBadge();
    renderCart();
}
function changeQty(key, d) {
    if (!cart[key]) return;
    cart[key].qty += d;
    if (cart[key].qty <= 0) delete cart[key];
    saveCart();
    updateCartBadge(); renderCart();
}
function cartCount() { return Object.values(cart).reduce((s, v) => s + v.qty, 0); }
function cartTotal() { return Object.values(cart).reduce((s, v) => s + v.unit * v.qty, 0); }
// Итог с учётом доставки и упаковки.
function orderTotal() { return cartTotal() + (fulfillment === 'delivery' ? DELIVERY_FEE : 0) + PACKAGING_FEE; }
let lastCartCount = 0;
function updateCartBadge() {
    const b = document.getElementById('cart-badge');
    const n = cartCount();
    b.textContent = n; b.classList.toggle('show', n > 0);
    if (n > lastCartCount) {
        b.classList.remove('bump');
        void b.offsetWidth;   // рестарт анимации
        b.classList.add('bump');
    }
    lastCartCount = n;
}
function renderCart() {
    const wrap = document.getElementById('view-client-cart');
    const keys = Object.keys(cart);
    if (!keys.length) {
        wrap.innerHTML = `
            <div class="brand-bar"><div class="wordmark">Любовь-Марковь</div></div>
            <div class="empty">
                <div class="illus">${engravingCup()}</div>
                <h2>Заказ пуст</h2>
                <p>Добавьте что-нибудь из меню,<br>чтобы забрать без очереди.</p>
                <button class="main-btn auto" onclick="switchTab('client','menu')">Открыть меню</button>
            </div>`;
        return;
    }
    const rows = keys.map((k) => {
        const v = cart[k];
        return `
        <div class="cart-item">
            <div class="ci-thumb cat-${v.catKey}">${cupArt()}</div>
            <div class="ci-main">
                <div class="ci-name">${v.name}</div>
                <div class="ci-price">${v.mods ? v.mods + ' · ' : ''}${money(v.unit)}</div>
            </div>
            <div class="qty">
                <button onclick="changeQty('${k}',-1)" aria-label="Меньше">−</button>
                <span>${v.qty}</span>
                <button onclick="changeQty('${k}',1)" aria-label="Больше">+</button>
            </div>
        </div>`;
    }).join('');
    const deliverySel = fulfillment === 'delivery';
    const st = shopStatus();
    // Доставка закрывается раньше самовывоза (курьеру нужно доехать) или её мог
    // приостановить владелец.
    const deliveryOff = !st.delivery || !DELIVERY_ENABLED;
    const ordersOff = !st.pickup;
    wrap.innerHTML = `
        <div class="brand-bar"><div class="wordmark">Любовь-Марковь</div></div>
        <span class="eyebrow">Ваш заказ</span>
        <h1 class="page-title">Корзина</h1>
        <div class="cart-list">${rows}</div>

        <div class="fulfil">
            <button class="seg ${!deliverySel ? 'on' : ''}" onclick="setFulfil('pickup')">${IC.bag} Заберу сам</button>
            <button class="seg ${deliverySel ? 'on' : ''} ${deliveryOff ? 'seg-off' : ''}" ${deliveryOff ? 'disabled' : ''} onclick="setFulfil('delivery')">${IC.home} Доставка</button>
        </div>
        ${deliverySel ? `
        <div class="delivery-box">
            <div class="delivery-warn">${IC.warn}<span>Доставляем <b>только в апартаменты</b> нашего здания. Курьер принесёт заказ прямо к двери.</span></div>
            <div class="field-grid">
                <label class="field"><span>Подъезд</span><input inputmode="numeric" value="${delivery.entrance}" oninput="setDeliveryField('entrance',this.value)" placeholder="№"></label>
                <label class="field"><span>Этаж</span><input inputmode="numeric" value="${delivery.floor}" oninput="setDeliveryField('floor',this.value)" placeholder="№"></label>
            </div>
            <label class="field"><span>Номер апартаментов</span><input value="${delivery.apt}" oninput="setDeliveryField('apt',this.value)" placeholder="Напр. 512"></label>
        </div>` : ''}

        <label class="field cart-comment"><span>Комментарий к заказу</span>
            <input value="${orderComment.replace(/"/g, '&quot;')}" maxlength="300"
                   oninput="setOrderComment(this.value)" placeholder="Напр. без сахара, погорячее"></label>
        ${PHONE ? `<a class="call-btn" href="tel:${PHONE.replace(/[^\d+]/g, '')}">${IC.phone} Позвонить в кофейню</a>` : ''}

        <div class="summary">
            <div class="row"><span>Позиции</span><span>${cartCount()} шт.</span></div>
            <div class="row"><span>Получение</span><span>${deliverySel ? 'Доставка в апартаменты' : 'Самовывоз из кофейни'}</span></div>
            ${deliverySel ? `<div class="row"><span>Доставка</span><span>+${money(DELIVERY_FEE)}</span></div>` : ''}
            ${PACKAGING_FEE ? `<div class="row"><span>Упаковка</span><span>+${money(PACKAGING_FEE)}</span></div>` : ''}
            <div class="row"><span>Оплата</span><span>${PAYMENT_ONLINE ? 'картой в приложении' : 'на кассе при получении'}</span></div>
            <div class="row total"><span>Итого</span><span>${money(orderTotal())}</span></div>
        </div>
        ${PAY_BY_LINK ? `
        <div class="delivery-box">
            ${NEED_EMAIL ? `<label class="field"><span>E-mail для чека</span>
                <input type="email" inputmode="email" autocomplete="email" value="${payEmail}"
                       oninput="setPayEmail(this.value)" placeholder="you@example.com"></label>` : ''}
            <p class="pay-note">Оплата откроется в браузере: можно картой или через СБП — выбрать свой банк и подтвердить в его приложении.${NEED_EMAIL ? ' Кассовый чек придёт на этот e-mail.' : ''}</p>
        </div>`
        : PAYMENT_ONLINE ? `<p class="pay-note">Telegram попросит e-mail — на него придёт кассовый чек.</p>` : ''}
        ${ordersOff ? `<div class="closed-note">${IC.warn}<span>${st.open
                ? `Приём заказов на сегодня закрыт. Кофейня работает до ${st.closesAt}.`
                : `Сейчас закрыто${st.opensAt ? `, откроемся в ${st.opensAt}` : ''}. ${hoursText()}`}</span></div>`
          : deliveryOff ? `<div class="closed-note">${IC.warn}<span>${!DELIVERY_ENABLED
                ? 'Доставка временно приостановлена. Сейчас доступен только самовывоз.'
                : `Доставку принимаем до ${st.lastDelivery}. Сейчас доступен только самовывоз — до ${st.lastPickup}.`}</span></div>` : ''}
        <div class="checkout"><button class="main-btn" ${ordersOff ? 'disabled' : ''} onclick="checkout()">${ordersOff
            ? 'Заказы сейчас не принимаем'
            : `${PAYMENT_ONLINE ? 'Оплатить' : (deliverySel ? 'Оформить доставку' : 'Оформить заказ')} · ${money(orderTotal())}`}</button></div>`;
}

// Пока счёт создаётся, кнопка заблокирована: второй клик по «Оплатить»
// раньше заводил ещё один заказ и съедал следующий номер.
let checkoutBusy = false;
async function checkout() {
    if (checkoutBusy) return;
    if (!cartCount()) return;
    if (fulfillment === 'delivery' && (!delivery.entrance.trim() || !delivery.floor.trim() || !delivery.apt.trim())) {
        toast('Укажите подъезд, этаж и апартаменты');
        return;
    }
    const st = shopStatus();
    if (!st.pickup) {
        toast(st.open ? `Приём заказов закрыт (до ${st.lastPickup})` : `Закрыто · откроемся в ${st.opensAt}`);
        return;
    }
    if (fulfillment === 'delivery' && !st.delivery) {
        toast(`Доставку принимаем до ${st.lastDelivery}`);
        return;
    }
    if (PAY_BY_LINK && NEED_EMAIL && !emailValid(payEmail)) {
        toast('Укажите e-mail — на него придёт чек');
        return;
    }
    checkoutBusy = true;
    const btn = document.querySelector('#view-client-cart .checkout .main-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Оформляем…'; }
    try {
        if (LIVE) await checkoutLive(); else checkoutDemo();
    } finally {
        checkoutBusy = false;
        if (btn && btn.isConnected) renderCart();
    }
}
async function checkoutLive() {
    const lines = Object.values(cart).map((v) => ({ productId: v.productId, optionIds: v.optionIds, qty: v.qty }));
    const body = { fulfillment, lines };
    if (fulfillment === 'delivery') body.delivery = { ...delivery };
    if (orderComment.trim()) body.comment = orderComment.trim();
    if (PAY_BY_LINK && NEED_EMAIL) body.email = payEmail.trim();
    const r = await api('/api/orders', 'POST', body);
    if (!r.ok) {
        // Позиции в корзине ссылаются на устаревшее меню (например, кофейня
        // пересобрала базу) — сама корзина уже не оформится. Чистим её и уводим
        // человека в свежее меню, чтобы он не бился в «Недопустимую опцию».
        if (r.data && (r.data.error === 'bad_order' || r.data.error === 'menu_changed')) {
            clearCart();
            updateCartBadge(); renderCart();
            toast('Меню обновилось — соберите заказ заново');
            await reloadMenu();
            switchTab('client', 'menu');
            return;
        }
        toast((r.data && r.data.message) || 'Не удалось оформить заказ');
        return;
    }
    const number = r.data.order.number;
    // Оплата по ссылке: показываем экран со ссылкой, дальше клиент платит в
    // браузере (карта или СБП), а мы опрашиваем статус заказа.
    if (r.data.paymentUrl) {
        openPayScreen(r.data.order, r.data.paymentUrl);
        return;
    }
    // Онлайн-оплата: сервер вернул ссылку-счёт — открываем платёжное окно Telegram.
    // Заказ до оплаты висит в статусе pending и баристе не показывается, поэтому
    // корзину чистим только после успешной оплаты.
    if (r.data.invoiceLink) {
        if (!tg || !tg.openInvoice) {
            toast('Обновите Telegram, чтобы оплатить заказ');
            return;
        }
        setVerticalSwipes(true);
        tg.openInvoice(r.data.invoiceLink, (status) => {
            setVerticalSwipes(false);
            if (status === 'paid') {
                clearCart();
                updateCartBadge(); renderCart();
                toast('Оплачено ✓ Заказ ' + number + ' принят');
                loadClientOrders().then(() => switchTab('client', 'orders'));
            } else if (status === 'failed') {
                toast('Оплата не прошла. Попробуйте ещё раз');
            } else {
                toast('Оплата отменена');
            }
        });
        return;
    }
    // Оффлайн-оплата: заказ сразу оформлен.
    clearCart();
    updateCartBadge(); renderCart();
    toast('Заказ ' + number + ' оформлен ✓');
    switchTab('client', 'orders');
}
// ============================================================
//  Экран оплаты по ссылке (ЮKassa: карта или СБП в браузере)
// ============================================================
// Платёжная шторка Telegram умеет только карту и на Android разъезжает под
// клавиатурой. Поэтому уводим клиента на страницу ЮKassa во внешнем браузере —
// там есть СБП с выбором банка, — а сами ждём подтверждения оплаты.
let payState = null;   // { orderId, number, total, url, timer, tries }

function openPayScreen(order, url) {
    closePayScreen();
    payState = { orderId: order.id, number: order.number, total: order.total, url, tries: 0 };
    renderPayScreen('idle');
    // Возврат из браузера в приложение — самый вероятный момент оплаты.
    document.addEventListener('visibilitychange', onPayVisibility);
    payState.timer = setInterval(pollPayment, 3000);
}
function closePayScreen() {
    if (payState && payState.timer) clearInterval(payState.timer);
    document.removeEventListener('visibilitychange', onPayVisibility);
    payState = null;
    const el = document.getElementById('payscreen');
    if (el) { el.classList.remove('show'); setTimeout(() => { if (!payState) el.innerHTML = ''; }, 260); }
}
function onPayVisibility() { if (!document.hidden) pollPayment(); }

function openPayLink() {
    if (!payState) return;
    renderPayScreen('waiting');
    // openLink уводит в внешний браузер — оттуда СБП открывает приложение банка.
    if (tg && tg.openLink) tg.openLink(payState.url, { try_instant_view: false });
    else window.open(payState.url, '_blank');
}

async function pollPayment() {
    if (!payState || payState.busy) return;
    payState.busy = true;
    try {
        const r = await api(`/api/orders/${payState.orderId}/payment`);
        if (!r.ok || !payState) return;
        if (r.data.paymentStatus === 'paid') {
            const number = payState.number;
            closePayScreen();
            clearCart();
            updateCartBadge(); renderCart();
            toast('Оплачено ✓ Заказ ' + number + ' принят');
            await loadClientOrders();
            switchTab('client', 'orders');
        } else if (r.data.paymentStatus === 'expired') {
            closePayScreen();
            toast('Счёт отменён. Оформите заказ заново');
        }
    } finally {
        if (payState) payState.busy = false;
    }
}

function renderPayScreen(mode) {
    const el = document.getElementById('payscreen');
    if (!el || !payState) return;
    const waiting = mode === 'waiting';
    el.innerHTML = `
        <div class="pay-panel">
            <div class="pay-illus">${engravingCup()}</div>
            <span class="eyebrow">Заказ ${payState.number}</span>
            <h2 class="pay-sum">${money(payState.total)}</h2>
            <p class="pay-lead">${waiting
                ? 'Ждём подтверждения оплаты. Как оплатите — вернитесь сюда, заказ уйдёт баристе автоматически.'
                : 'Оплата откроется в браузере. Там можно заплатить картой или выбрать свой банк через СБП.'}</p>
            <button class="main-btn auto" onclick="openPayLink()">${waiting ? 'Открыть оплату ещё раз' : 'Перейти к оплате'}</button>
            ${waiting ? '<div class="pay-spinner" aria-hidden="true"></div>' : ''}
            <button class="pay-cancel" onclick="cancelPayScreen()">Отменить</button>
        </div>`;
    requestAnimationFrame(() => el.classList.add('show'));
}
function cancelPayScreen() {
    closePayScreen();
    // Заказ остаётся неоплаченным и сам сгорит по таймауту — корзину не трогаем,
    // чтобы клиент мог попробовать снова.
    toast('Оплата отменена. Корзина сохранена');
}

function checkoutDemo() {
    const vals = Object.values(cart);
    const number = 'А-' + (nextDemoOrderSeq());
    const ts = Date.now();
    const order = {
        id: number, number, status: 'created', statusLabel: 'Новый',
        fulfillment, address: fulfillment === 'delivery' ? `Подъезд ${delivery.entrance}, этаж ${delivery.floor}, апарт. ${delivery.apt}` : '',
        total: orderTotal(), items: vals.map((v) => ({ qty: v.qty, name: v.name, mods: v.mods })),
        createdAt: ts, customer: 'Вы',
    };
    clientOrders.unshift(order);
    baristaOrders.unshift({ ...order, ts: fmtTime(ts) });
    clearCart();
    updateCartBadge(); renderCart(); renderClientOrders(); renderBarista();
    toast('Заказ ' + number + ' оформлен ✓');
    switchTab('client', 'orders');
}
let demoSeq = 7;
function nextDemoOrderSeq() { return ++demoSeq; }

async function loadClientOrders() {
    const list = document.getElementById('client-orders-list');
    list.innerHTML = '<div class="empty-note">Загрузка…</div>';
    const r = await api('/api/orders/mine');
    if (!r.ok) { list.innerHTML = '<div class="empty-note">Не удалось загрузить заказы</div>'; return; }
    clientOrders = r.data.orders;
    renderClientOrders();
}
function renderClientOrders() {
    const list = document.getElementById('client-orders-list');
    if (!clientOrders.length) { list.innerHTML = '<div class="empty-note">Заказов пока нет.</div>'; return; }
    list.innerHTML = clientOrders.map((o) => `
        <div class="order-card">
            <div class="order-left">
                <span class="order-ic">${IC.book}</span>
                <div class="order-info">
                    <span class="order-id">Заказ ${o.number}</span>
                    <span class="order-date">${fmtDate(o.createdAt)}</span>
                    <span class="order-items">${o.items.map((it) => it.name).join(' · ')}</span>
                    ${o.fulfillment === 'delivery' && o.address ? `<span class="order-deliv">🛵 ${o.address}</span>` : ''}
                </div>
            </div>
            <div class="order-right">
                <span class="order-price">${money(o.total)}</span>
                <span class="pill ${STATUS_CLASS[o.status] || 'st-new'}">${o.statusLabel || STATUS_TEXT[o.status]}</span>
            </div>
        </div>`).join('');
}

// ============================================================
//  Бариста
// ============================================================
function setBaristaFilter(btn, f) {
    baristaFilter = f;
    btn.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    renderBarista();
}
async function loadBaristaOrders() {
    const r = await api('/api/staff/orders');
    if (!r.ok) { toast('Не удалось загрузить ленту'); return; }
    baristaOrders = [...r.data.active, ...r.data.archive].map((o) => ({ ...o, ts: fmtTime(o.updatedAt || o.createdAt) }));
}
function renderBarista() {
    let list = baristaOrders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (baristaFilter === 'new') list = list.filter((o) => o.status === 'created');
    else if (baristaFilter === 'work') list = list.filter((o) => o.status === 'accepted' || o.status === 'preparing');
    else if (baristaFilter === 'ready') list = list.filter((o) => o.status === 'ready');
    document.getElementById('feed-count').textContent = baristaOrders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

    document.getElementById('barista-feed').innerHTML = list.length ? list.map(ticketHTML).join('')
        : '<div class="empty-note">Активных заказов нет.<br>Новые появятся здесь автоматически.</div>';

    const done = baristaOrders.filter((o) => !ACTIVE_STATUSES.includes(o.status));
    // Состав заказа в архиве раскрывается по тапу — в том числе у отменённых:
    // владелец хочет видеть, что было в отменённом заказе.
    document.getElementById('barista-archive').innerHTML = done.length ? done.map((o) => `
        <div class="order-card archive-card" onclick="this.classList.toggle('open')">
            <div class="order-row">
                <div class="order-left"><span class="order-ic">${IC.book}</span>
                    <div class="order-info"><span class="order-id">Заказ ${o.number}</span><span class="order-date">${o.ts} · ${o.customer}</span></div>
                </div>
                <span class="pill ${STATUS_CLASS[o.status]}">${o.statusLabel || STATUS_TEXT[o.status]}</span>
            </div>
            <div class="archive-detail">
                <ul class="ticket-lines">${(o.items || []).map((it) => `<li><span class="ln-qty">${it.qty}×</span>${it.name}${it.mods ? ` <span class="ln-mods">· ${it.mods}</span>` : ''}</li>`).join('')}</ul>
                ${o.comment ? `<div class="ticket-comment">💬 ${o.comment}</div>` : ''}
                <div class="archive-total">${money(o.total)}${o.fulfillment === 'delivery' && o.address ? ` · 🛵 ${o.address}` : ''}</div>
            </div>
        </div>`).join('') : '<div class="empty-note">Архив пуст.</div>';
}
function ticketHTML(o) {
    const lines = o.items.map((it) => `<li><span class="ln-qty">${it.qty}×</span>${it.name}${it.mods ? ` <span class="ln-mods">· ${it.mods}</span>` : ''}</li>`).join('');
    const flow = FLOW[o.status];
    let actions = '';
    if (o.status === 'created') {
        actions = `<button class="btn-sm btn-ghost" onclick="rejectOrder('${o.id}')">Отклонить</button>
                   <button class="btn-sm ${flow.cls}" onclick="advanceOrder('${o.id}')">${flow.btn}</button>`;
    } else if (flow) {
        actions = `<button class="btn-sm ${flow.cls}" onclick="advanceOrder('${o.id}')">${flow.btn}</button>`;
    }
    return `
    <div class="ticket" data-status="${o.status}">
        <div class="ticket-head">
            <div class="ticket-num">${o.number} <small>${o.customer}</small></div>
            <span class="pill ${STATUS_CLASS[o.status]}">${o.statusLabel || STATUS_TEXT[o.status]}</span>
        </div>
        <div class="ticket-deliv ${o.fulfillment === 'delivery' ? '' : 'pickup'}">
            ${o.fulfillment === 'delivery' ? IC.home + ' Доставка · ' + o.address : IC.bag + ' Самовывоз'}
        </div>
        <ul class="ticket-lines">${lines}</ul>
        ${o.comment ? `<div class="ticket-comment">💬 ${o.comment}</div>` : ''}
        <div class="ticket-foot">
            <span class="ticket-total">${money(o.total)}</span>
            <span class="timer">⏱ ${o.ts}</span>
            ${actions}
        </div>
    </div>`;
}
async function advanceOrder(id) {
    const o = baristaOrders.find((x) => x.id === id);
    if (!o || !FLOW[o.status]) return;
    if (LIVE) {
        const r = await api(`/api/staff/orders/${id}/event`, 'POST', { event: FLOW[o.status].event });
        if (!r.ok) { toast('Не удалось обновить заказ'); return; }
        Object.assign(o, r.data.order, { ts: o.ts });
    } else {
        o.status = FLOW[o.status].target; o.statusLabel = STATUS_TEXT[o.status];
        const co = clientOrders.find((c) => c.id === id);
        if (co) { co.status = o.status; co.statusLabel = o.statusLabel; }
    }
    renderBarista();
    if (!LIVE) renderClientOrders();
    toast('Заказ ' + o.number + ' → ' + (o.statusLabel || STATUS_TEXT[o.status]));
}
async function rejectOrder(id) {
    const o = baristaOrders.find((x) => x.id === id);
    if (!o) return;
    if (LIVE) {
        const r = await api(`/api/staff/orders/${id}/event`, 'POST', { event: 'reject' });
        if (!r.ok) { toast('Не удалось отклонить заказ'); return; }
        Object.assign(o, r.data.order, { ts: o.ts });
    } else {
        o.status = 'rejected'; o.statusLabel = 'Отклонён';
        const co = clientOrders.find((c) => c.id === id);
        if (co) { co.status = 'rejected'; co.statusLabel = 'Отклонён'; }
    }
    renderBarista();
    if (!LIVE) renderClientOrders();
    toast('Заказ ' + o.number + ' отклонён');
}

// ============================================================
//  Стоп-лист
// ============================================================
// Меню большое, поэтому листать его в поиске «что закончилось» невозможно —
// экран стоп-листа ищет и по позициям, и по добавкам.
let stopQuery = '';
let stopTimer;
function setStopSearch(v) {
    stopQuery = v;
    clearTimeout(stopTimer);
    stopTimer = setTimeout(renderStopList, 110);
}
const stopMatch = (name) => !stopQuery.trim() || name.toLowerCase().includes(stopQuery.trim().toLowerCase());

function stopRow({ key, name, available, sub, onchange, thumb }) {
    return `
        <div class="stop-row">
            ${thumb || '<span class="thumb thumb-mod">' + IC.bag + '</span>'}
            <span class="sr-name">${name}${sub ? `<em class="sr-sub">${sub}</em>` : ''}</span>
            <span class="sr-state" id="ss-${key}">${available ? 'в наличии' : 'в стопе'}</span>
            <label class="switch">
                <input type="checkbox" ${available ? 'checked' : ''} onchange="${onchange}" aria-label="${name}">
                <span class="slider"></span>
            </label>
        </div>`;
}

function renderStopList() {
    const wrap = document.getElementById('stop-list');
    if (!wrap) return;
    const parts = [];

    const products = MENU.filter((p) => stopMatch(p.name));
    if (products.length) {
        parts.push('<div class="stop-head">Позиции меню</div>');
        parts.push(products.map((p) => stopRow({
            key: p.id, name: p.name, available: p.available, sub: p.categoryName,
            thumb: `<span class="thumb cat-${p.catKey}">${cupArt()}</span>`,
            onchange: `toggleStop('${p.id}',this.checked)`,
        })).join(''));
    }

    // Добавки: молоко, сиропы и прочее. Закончилось растительное молоко —
    // снимается везде, где эта опция предлагается.
    for (const g of MODIFIER_GROUPS) {
        const opts = g.options.filter((o) => stopMatch(o.name));
        if (!opts.length) continue;
        parts.push(`<div class="stop-head">${g.name}</div>`);
        parts.push(opts.map((o) => stopRow({
            key: o.ids[0], name: o.name, available: o.available,
            sub: o.priceDelta ? `+${o.priceDelta} ₽` : '',
            onchange: `toggleStopOption('${o.ids.join(',')}',this.checked)`,
        })).join(''));
    }

    wrap.innerHTML = parts.length ? parts.join('')
        : '<div class="empty-note">Ничего не найдено</div>';
}

async function toggleStop(id, available) {
    const p = findProduct(id);
    if (!p) return;
    if (LIVE) {
        const r = await api('/api/staff/stop', 'POST', { productId: id, available });
        if (!r.ok) { toast('Не удалось обновить стоп-лист'); renderStopList(); return; }
    }
    p.available = available;
    const badge = document.getElementById('ss-' + id);
    if (badge) badge.textContent = available ? 'в наличии' : 'в стопе';
    renderMenu(); renderOwnerMenu();
    toast(p.name + (available ? ' — снова в меню' : ' — в стоп-лист'));
}

async function toggleStopOption(idList, available) {
    const ids = String(idList).split(',');
    let opt = null;
    for (const g of MODIFIER_GROUPS) {
        const o = g.options.find((x) => x.ids[0] === ids[0]);
        if (o) { opt = o; break; }
    }
    if (!opt) return;
    if (LIVE) {
        const r = await api('/api/staff/stop', 'POST', { optionIds: ids, available });
        if (!r.ok) { toast('Не удалось обновить стоп-лист'); renderStopList(); return; }
    }
    opt.available = available;
    const badge = document.getElementById('ss-' + ids[0]);
    if (badge) badge.textContent = available ? 'в наличии' : 'в стопе';
    toast(opt.name + (available ? ' — снова доступно' : ' — в стоп-лист'));
}

// ============================================================
//  Владелец
// ============================================================
function renderOwnerMenu() {
    const wrap = document.getElementById('owner-menu-list');
    if (!wrap) return;
    // Тап по позиции — редактирование цены/названия/наличия (только LIVE).
    wrap.innerHTML = MENU.map((p) => `
        <div class="list-row${LIVE ? ' editable' : ''}" ${LIVE ? `onclick="openProductEdit('${p.id}')"` : ''}>
            <div class="lr-ic">${cupArt()}</div>
            <div class="lr-main">
                <div class="lr-title">${p.name}</div>
                <div class="lr-sub">${p.categoryName}${p.available ? '' : ' · в стопе'}</div>
            </div>
            <div class="lr-price">${money(p.price)}${LIVE ? ' ✏️' : ''}</div>
        </div>`).join('');
}

// Шторка редактирования товара владельцем — цена, название, наличие.
function openProductEdit(productId) {
    const p = findProduct(productId);
    if (!p) return;
    const el = document.getElementById('sheet');
    el.innerHTML = `
        <div class="sheet-scrim" onclick="closeSheet()"></div>
        <div class="sheet-panel">
            <div class="sheet-grab"></div>
            <div class="sheet-head">
                <div><div class="sheet-name">Редактировать</div><div class="sheet-base">${p.categoryName}</div></div>
                <button class="sheet-x" onclick="closeSheet()" aria-label="Закрыть">✕</button>
            </div>
            <label class="field"><span>Название</span>
                <input id="edit-name" value="${p.name.replace(/"/g, '&quot;')}" maxlength="120"></label>
            <label class="field"><span>Цена, ₽</span>
                <input id="edit-price" inputmode="numeric" value="${p.price}"></label>
            <label class="edit-toggle">
                <span>В наличии</span>
                <label class="switch"><input type="checkbox" id="edit-avail" ${p.available ? 'checked' : ''}><span class="slider"></span></label>
            </label>
            <div class="sheet-foot">
                <button class="main-btn auto" onclick="saveProductEdit('${p.id}')">Сохранить</button>
            </div>
        </div>`;
    requestAnimationFrame(() => el.classList.add('show'));
}
async function saveProductEdit(productId) {
    const name = document.getElementById('edit-name').value.trim();
    const price = Math.round(Number(document.getElementById('edit-price').value));
    const available = document.getElementById('edit-avail').checked;
    if (!name) { toast('Название не может быть пустым'); return; }
    if (!Number.isFinite(price) || price < 0) { toast('Некорректная цена'); return; }
    const r = await api('/api/staff/product', 'POST', { productId, name, price, available });
    if (!r.ok) { toast((r.data && r.data.message) || 'Не удалось сохранить'); return; }
    // Обновляем локально и перерисовываем — без перезагрузки всего меню.
    const p = findProduct(productId);
    if (p) { p.name = name; p.price = price; p.available = available; }
    closeSheet();
    renderOwnerMenu(); renderMenu();
    toast('Сохранено ✓');
}
async function loadOwnerSummary() {
    if (!LIVE) return;   // демо-цифры уже в вёрстке статично
    const r = await api('/api/staff/summary');
    if (!r.ok) return;
    const s = r.data;
    const vals = document.querySelectorAll('#view-owner-summary .stat-value');
    if (vals[0]) vals[0].textContent = money(s.revenue);
    if (vals[1]) vals[1].textContent = s.count;
    if (vals[2]) vals[2].textContent = money(s.avg);
    if (vals[3]) vals[3].textContent = s.cancelled;
    const cl = document.getElementById('stat-clients');
    if (cl && s.clients !== undefined) cl.textContent = s.clients;
    const bars = document.querySelectorAll('#view-owner-summary .bars .bar');
    const shownHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const max = Math.max(1, ...shownHours.map((h) => s.hours[h] || 0));
    bars.forEach((bar, idx) => {
        const h = shownHours[idx]; const v = s.hours[h] || 0;
        bar.style.height = Math.max(4, Math.round((v / max) * 100)) + '%';
        bar.classList.toggle('peak', v > 0 && v === max);
        const span = bar.querySelector('span'); if (span) span.textContent = h;
    });
}
// Настройки кофейни у владельца: доставка (вкл/пауза) и телефон.
let ownerSettings = { phone: '', deliveryEnabled: true, deliveryPausedUntil: 0 };
async function loadOwnerSettings() {
    if (!LIVE) return;
    const r = await api('/api/staff/settings');
    if (!r.ok) return;
    ownerSettings = r.data;
    renderOwnerSettings();
}
function renderOwnerSettings() {
    const wrap = document.getElementById('owner-settings');
    if (!wrap) return;
    const paused = ownerSettings.deliveryPausedUntil && ownerSettings.deliveryPausedUntil > Date.now();
    const pauseTime = paused ? new Date(ownerSettings.deliveryPausedUntil).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
    wrap.innerHTML = `
        <h3>Доставка и контакты</h3>
        <label class="edit-toggle">
            <span>Доставка включена</span>
            <label class="switch"><input type="checkbox" id="set-deliv" ${ownerSettings.deliveryEnabled ? 'checked' : ''} onchange="toggleDelivery(this.checked)"><span class="slider"></span></label>
        </label>
        ${ownerSettings.deliveryEnabled ? `
        <div class="pause-row">
            ${paused
                ? `<div class="pause-note">⏸ Доставка на паузе до ${pauseTime}</div>
                   <button class="btn-sm btn-advance" onclick="setDeliveryPause(0)">Возобновить</button>`
                : `<span class="pause-label">Пауза доставки:</span>
                   <button class="btn-sm btn-ghost" onclick="setDeliveryPause(60)">на 1 ч</button>
                   <button class="btn-sm btn-ghost" onclick="setDeliveryPause('today')">до утра</button>`}
        </div>` : ''}
        <label class="field"><span>Телефон кофейни</span>
            <input id="set-phone" inputmode="tel" value="${(ownerSettings.phone || '').replace(/"/g, '&quot;')}" placeholder="+7 999 123-45-67">
        </label>
        <button class="btn-sm btn-primary" onclick="saveOwnerPhone()">Сохранить телефон</button>`;
}
async function toggleDelivery(on) {
    const r = await api('/api/staff/settings', 'POST', { deliveryEnabled: on });
    if (!r.ok) { toast('Не удалось изменить'); return; }
    ownerSettings.deliveryEnabled = on;
    renderOwnerSettings();
    toast(on ? 'Доставка включена' : 'Доставка выключена');
}
async function setDeliveryPause(kind) {
    let minutes = 0;
    if (kind === 60) minutes = 60;
    else if (kind === 'today') {
        // До 8 утра следующего дня — грубо «до утра».
        const d = new Date(); d.setHours(24 + 8, 0, 0, 0);
        minutes = Math.round((d.getTime() - Date.now()) / 60000);
    }
    const r = await api('/api/staff/delivery-pause', 'POST', { minutes });
    if (!r.ok) { toast('Не удалось'); return; }
    ownerSettings.deliveryPausedUntil = r.data.deliveryPausedUntil || 0;
    renderOwnerSettings();
    toast(minutes ? 'Доставка на паузе' : 'Доставка возобновлена');
}
async function saveOwnerPhone() {
    const phone = document.getElementById('set-phone').value.trim();
    const r = await api('/api/staff/settings', 'POST', { phone });
    if (!r.ok) { toast('Не удалось сохранить'); return; }
    ownerSettings.phone = phone;
    toast('Телефон сохранён ✓');
}

async function loadOwnerTeam() {
    if (!LIVE) return;   // демо-состав уже в вёрстке статично
    const r = await api('/api/staff/list');
    if (!r.ok) return;
    const wrap = document.querySelector('#view-owner-team .list-block');
    if (!wrap) return;
    wrap.innerHTML = r.data.staff.map((s) => `
        <div class="list-row">
            <div class="lr-ic">${s.role === 'owner' ? IC.crown : IC.apron}</div>
            <div class="lr-main">
                <div class="lr-title">${s.name}</div>
                <div class="lr-sub"><span class="dot ${s.active ? 'on' : 'off'}"></span>${s.active ? 'активен' : 'не активен'}</div>
            </div>
            <span class="role-chip ${s.role === 'owner' ? 'owner' : 'barista'}">${s.role === 'owner' ? 'Владелец' : s.role === 'manager' ? 'Менеджер' : 'Бариста'}</span>
        </div>`).join('');
}

// ============================================================
//  Тост
// ============================================================
let toastTimer;
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

// ============================================================
//  Интеграция с Telegram + запуск
// ============================================================
// Свайпы отключены ради прокрутки внутри приложения, но платёжная шторка
// Telegram открывается поверх нас и на Android с этим конфликтует: форма
// карты уезжает под клавиатуру. На время оплаты возвращаем жесты клиенту.
function setVerticalSwipes(enabled) {
    if (!tg) return;
    try {
        if (enabled) { if (tg.enableVerticalSwipes) tg.enableVerticalSwipes(); }
        else if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    } catch { /* старые клиенты этих методов не знают */ }
}
function initTelegramShell() {
    if (!tg) return;
    try {
        tg.ready();
        tg.expand();
        // Отключаем «свайп вниз = свернуть» — иначе Telegram перехватывает
        // вертикальные жесты и внутри приложения ничего не прокручивается.
        setVerticalSwipes(false);
        if (tg.setBackgroundColor) tg.setBackgroundColor('#FBF6EE');
        if (tg.setHeaderColor) tg.setHeaderColor('#FBF6EE');
        document.body.classList.add('in-telegram');
    } catch (e) { /* старые версии клиента — не критично */ }
}
function closeApp() {
    if (tg && tg.close) tg.close();
    else toast('Демо: закрытие мини-приложения');
}
function showAuthError(r) {
    const messages = {
        tenant_not_found: 'Кофейня не найдена. Проверьте ссылку у @BotFather.',
        tenant_no_bot: 'У кофейни ещё не подключён бот.',
        unauthorized: 'Не удалось подтвердить вход через Telegram. Переоткройте приложение.',
    };
    const text = (r.data && messages[r.data.error]) || 'Не удалось загрузить приложение. Попробуйте позже.';
    document.getElementById('role-client').innerHTML =
        `<div class="empty" style="height:100vh;padding:0 30px"><div class="illus">${engravingCup()}</div><h2>Не удалось войти</h2><p>${text}</p></div>`;
    document.querySelector('.preview-controls')?.remove();
}

// Разбор ответа /api/bootstrap в состояние приложения. Вынесено отдельно,
// чтобы меню можно было перезагрузить на лету (reloadMenu), не перезапуская
// всё приложение — например, после того как корзина оказалась несовместима с
// обновившимся меню.
function applyBootstrap(data) {
    if (data.tenant && Number.isFinite(data.tenant.deliveryFee)) DELIVERY_FEE = data.tenant.deliveryFee;
    if (data.tenant && Number.isFinite(data.tenant.packagingFee)) PACKAGING_FEE = data.tenant.packagingFee;
    if (data.tenant) PAYMENT_ONLINE = data.tenant.paymentMode === 'online';
    if (data.tenant) PAY_BY_LINK = !!data.tenant.payByLink;
    if (data.tenant) NEED_EMAIL = data.tenant.needEmail !== false;
    HOURS = data.hours || null;
    MODIFIER_GROUPS = data.modifierGroups || [];
    if (data.tenant) PHONE = data.tenant.phone || '';
    if (data.tenant) DELIVERY_ENABLED = data.tenant.deliveryEnabled !== false;
    const catNameById = new Map(data.categories.map((c) => [c.id, c.name]));
    const menuCatIds = new Set(data.menu.map((p) => p.categoryId));
    CATEGORIES_LIST = data.categories.filter((c) => menuCatIds.has(c.id)).map((c) => c.name);
    MENU = data.menu.map((p) => {
        const categoryName = catNameById.get(p.categoryId) || '';
        return {
            id: p.id, name: p.name, price: p.price, available: p.available,
            description: p.description || '',
            photo_url: p.photoUrl || null,
            categoryName,
            catKey: catKeyFor(categoryName),
            groups: p.groups || [],
        };
    });
}
// Перезагрузка меню на лету: тянем свежий bootstrap и перерисовываем витрину.
async function reloadMenu() {
    if (!LIVE) return;
    const r = await api('/api/bootstrap');
    if (!r.ok) return;
    applyBootstrap(r.data);
    renderCategories(); renderMenu();
}

async function boot() {
    initTelegramShell();
    const logoMarkEl = document.getElementById('logo-mark');
    if (logoMarkEl) logoMarkEl.innerHTML = logoMark();

    // Переключатель ролей — только для демо вне Telegram. Внутри Telegram он не
    // нужен клиенту, но раньше висел в разметке и на медленном интернете мелькал
    // 10–15 секунд, пока не придёт bootstrap. Прячем сразу, ещё до запроса;
    // владельцу вернём его ниже (уже без кнопки «Клиент»).
    const willBeLive = !!(tg && tg.initData && API_BASE && !API_BASE.includes('REPLACE-WITH'));
    const previewControls = document.querySelector('.preview-controls');
    if (willBeLive && previewControls) previewControls.hidden = true;
    // Пока грузится меню (на плохой связи это долго) — показываем, что идёт
    // загрузка, а не пустой экран.
    if (willBeLive) {
        const grid = document.getElementById('menu-grid');
        if (grid) grid.innerHTML = '<div class="empty-note" style="grid-column:1/-1">Загружаем меню…</div>';
    }

    if (tg && tg.initData && API_BASE && !API_BASE.includes('REPLACE-WITH')) {
        const r = await api('/api/bootstrap');
        if (r.ok) {
            LIVE = true; ROLE = r.data.role;
            if (r.data.user && r.data.user.id) {
                CART_KEY = `lm:cart:v2:${TENANT}:${r.data.user.id}`;
                EMAIL_KEY = `lm:email:v1:${TENANT}:${r.data.user.id}`;
            }
            applyBootstrap(r.data);
        } else {
            showAuthError(r);
            return;
        }
    } else {
        MENU = demoProducts();
        CATEGORIES_LIST = [...new Set(MENU.map((p) => p.categoryName))];
    }

    // Приложение может висеть открытым через момент закрытия — раз в минуту
    // сверяем статус и перерисовываем, если он изменился.
    let lastShopKey = '';
    setInterval(() => {
        const st = shopStatus();
        const key = `${st.open}|${st.pickup}|${st.delivery}`;
        if (key === lastShopKey) return;
        lastShopKey = key;
        renderClosedBanner();
        if (document.querySelector('#view-client-cart.active')) renderCart();
    }, 60000);

    // Корзину поднимаем уже по загруженному меню — цены и стоп-лист свежие.
    restoreCart();

    // Рендерим только клиентское меню. Стоп-лист и меню владельца строятся
    // лениво при открытии своих вкладок (switchTab) — не грузим старт зря.
    renderCategories(); renderMenu(); updateCartBadge(); renderCart();

    if (LIVE) {
        const switcher = document.querySelector('.preview-controls');
        if (ROLE === 'client') {
            switcher?.remove();
            await loadClientOrders();
            switchRole('client');
        } else {
            await loadBaristaOrders(); renderBarista();
            if (ROLE === 'owner' || ROLE === 'manager') {
                // Владелец/менеджер часто работает и за стойкой — возвращаем
                // мини-переключатель «Бариста / Владелец» (без «Клиент»).
                switcher?.querySelector('#rs-client')?.remove();
                if (switcher) switcher.hidden = false;
                switchRole('owner');
                loadOwnerSummary(); loadOwnerSettings(); loadOwnerTeam();   // сразу подтягиваем реальные цифры
            } else {
                switcher?.remove();
                switchRole('barista');
            }
        }
    } else {
        renderClientOrders(); renderBarista();
        switchRole('client');
    }
}
document.addEventListener('DOMContentLoaded', boot);
