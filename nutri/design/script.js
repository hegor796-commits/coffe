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
        const res = await fetch(API_BASE + path, {
            method: method || 'GET',
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
const cart = {};                 // key -> { productId, name, catKey, mods, unit, qty, optionIds:[] }
let fulfillment = 'pickup';      // 'pickup' | 'delivery'
let DELIVERY_FEE = 50;           // наценка за доставку (₽), приходит из bootstrap
let PAYMENT_ONLINE = false;      // true — оплата картой в приложении (из bootstrap)
const delivery = { entrance: '', floor: '', apt: '' };
let baristaFilter = 'active';

function findProduct(id) { return MENU.find((p) => p.id === id); }
function setFulfil(mode) { fulfillment = mode; renderCart(); }
function setDeliveryField(field, val) { delivery[field] = val; }

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
    else if (role === 'owner' && tab === 'summary') loadOwnerSummary();
    else if (role === 'owner' && tab === 'team') loadOwnerTeam();
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

function renderMenu(opts) {
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

function defaultSelection(product) {
    const sel = {};
    for (const g of product.groups) {
        const def = g.options.find((o) => o.isDefault);
        if (def) { sel[g.id] = def.id; continue; }
        // Обязательную группу («Объём») предвыбираем первой опцией.
        // Необязательную (Молоко/Добавки) без явного дефолта оставляем
        // пустой — от неё можно отказаться.
        if (g.required && g.options[0]) sel[g.id] = g.options[0].id;
    }
    return sel;
}
function unitPrice(product, selected) {
    let unit = product.price;
    for (const g of product.groups) {
        const opt = g.options.find((o) => o.id === selected[g.id]);
        if (opt) unit += opt.priceDelta;
    }
    return unit;
}
function modsText(product, selected) {
    const parts = [];
    product.groups.forEach((g, i) => {
        const opt = g.options.find((o) => o.id === selected[g.id]);
        if (!opt) return;
        if (i === 0) parts.push(opt.name.split(' · ')[0]);   // короткая метка первой группы (обычно размер)
        else if (!opt.isDefault) parts.push(opt.name.toLowerCase());
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
    // Повторный тап по выбранной опции необязательной группы — снять выбор.
    if (g && !g.required && sheet.selected[groupId] === optionId) {
        delete sheet.selected[groupId];
    } else {
        sheet.selected[groupId] = optionId;
    }
    renderSheet();
}
function sheetQty(d) { sheet.qty = Math.max(1, sheet.qty + d); renderSheet(); }
function renderSheet() {
    const { product, selected, qty } = sheet;
    const el = document.getElementById('sheet');
    const chips = (g) => g.options.map((o) =>
        `<button class="opt ${selected[g.id] === o.id ? 'on' : ''}" onclick="selectOption('${g.id}','${o.id}')">
            <span>${o.name}</span>${o.priceDelta ? `<b>+${o.priceDelta} ₽</b>` : ''}
        </button>`).join('');
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
function cartKey(productId, selected) { return productId + '|' + Object.values(selected).sort().join(','); }
function addLine(product, selected, qty) {
    const key = cartKey(product.id, selected);
    if (cart[key]) cart[key].qty += qty;
    else cart[key] = {
        productId: product.id, name: product.name, catKey: product.catKey,
        mods: modsText(product, selected), unit: unitPrice(product, selected), qty,
        optionIds: Object.values(selected),
    };
    updateCartBadge();
    renderCart();
}
function changeQty(key, d) {
    if (!cart[key]) return;
    cart[key].qty += d;
    if (cart[key].qty <= 0) delete cart[key];
    updateCartBadge(); renderCart();
}
function cartCount() { return Object.values(cart).reduce((s, v) => s + v.qty, 0); }
function cartTotal() { return Object.values(cart).reduce((s, v) => s + v.unit * v.qty, 0); }
// Итог с учётом доставки (для самовывоза наценки нет).
function orderTotal() { return cartTotal() + (fulfillment === 'delivery' ? DELIVERY_FEE : 0); }
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
    wrap.innerHTML = `
        <div class="brand-bar"><div class="wordmark">Любовь-Марковь</div></div>
        <span class="eyebrow">Ваш заказ</span>
        <h1 class="page-title">Корзина</h1>
        <div class="cart-list">${rows}</div>

        <div class="fulfil">
            <button class="seg ${!deliverySel ? 'on' : ''}" onclick="setFulfil('pickup')">${IC.bag} Заберу сам</button>
            <button class="seg ${deliverySel ? 'on' : ''}" onclick="setFulfil('delivery')">${IC.home} Доставка</button>
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

        <div class="summary">
            <div class="row"><span>Позиции</span><span>${cartCount()} шт.</span></div>
            <div class="row"><span>Получение</span><span>${deliverySel ? 'Доставка в апартаменты' : 'Самовывоз из кофейни'}</span></div>
            ${deliverySel ? `<div class="row"><span>Доставка</span><span>+${money(DELIVERY_FEE)}</span></div>` : ''}
            <div class="row"><span>Оплата</span><span>${PAYMENT_ONLINE ? 'картой в приложении' : 'на кассе при получении'}</span></div>
            <div class="row total"><span>Итого</span><span>${money(orderTotal())}</span></div>
        </div>
        <div class="checkout"><button class="main-btn" onclick="checkout()">${PAYMENT_ONLINE ? 'Оплатить' : (deliverySel ? 'Оформить доставку' : 'Оформить заказ')} · ${money(orderTotal())}</button></div>`;
}

async function checkout() {
    if (!cartCount()) return;
    if (fulfillment === 'delivery' && (!delivery.entrance.trim() || !delivery.floor.trim() || !delivery.apt.trim())) {
        toast('Укажите подъезд, этаж и апартаменты');
        return;
    }
    if (LIVE) await checkoutLive(); else checkoutDemo();
}
async function checkoutLive() {
    const lines = Object.values(cart).map((v) => ({ productId: v.productId, optionIds: v.optionIds, qty: v.qty }));
    const body = { fulfillment, lines };
    if (fulfillment === 'delivery') body.delivery = { ...delivery };
    const r = await api('/api/orders', 'POST', body);
    if (!r.ok) {
        toast((r.data && r.data.message) || 'Не удалось оформить заказ');
        return;
    }
    const number = r.data.order.number;
    // Онлайн-оплата: сервер вернул ссылку-счёт — открываем платёжное окно Telegram.
    // Заказ до оплаты висит в статусе pending и баристе не показывается, поэтому
    // корзину чистим только после успешной оплаты.
    if (r.data.invoiceLink) {
        if (!tg || !tg.openInvoice) {
            toast('Обновите Telegram, чтобы оплатить заказ');
            return;
        }
        tg.openInvoice(r.data.invoiceLink, (status) => {
            if (status === 'paid') {
                Object.keys(cart).forEach((k) => delete cart[k]);
                fulfillment = 'pickup'; delivery.entrance = delivery.floor = delivery.apt = '';
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
    Object.keys(cart).forEach((k) => delete cart[k]);
    fulfillment = 'pickup'; delivery.entrance = delivery.floor = delivery.apt = '';
    updateCartBadge(); renderCart();
    toast('Заказ ' + number + ' оформлен ✓');
    switchTab('client', 'orders');
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
    Object.keys(cart).forEach((k) => delete cart[k]);
    fulfillment = 'pickup'; delivery.entrance = delivery.floor = delivery.apt = '';
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
    document.getElementById('barista-archive').innerHTML = done.length ? done.map((o) => `
        <div class="order-card">
            <div class="order-left"><span class="order-ic">${IC.book}</span>
                <div class="order-info"><span class="order-id">Заказ ${o.number}</span><span class="order-date">${o.ts} · ${o.customer}</span></div>
            </div>
            <span class="pill ${STATUS_CLASS[o.status]}">${o.statusLabel || STATUS_TEXT[o.status]}</span>
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
function renderStopList() {
    document.getElementById('stop-list').innerHTML = MENU.map((p) => `
        <div class="stop-row">
            <span class="thumb cat-${p.catKey}">${cupArt()}</span>
            <span class="sr-name">${p.name}</span>
            <span class="sr-state" id="ss-${p.id}">${p.available ? 'в наличии' : 'в стопе'}</span>
            <label class="switch">
                <input type="checkbox" ${p.available ? 'checked' : ''} onchange="toggleStop('${p.id}',this.checked)" aria-label="${p.name}">
                <span class="slider"></span>
            </label>
        </div>`).join('');
}
async function toggleStop(id, available) {
    const p = findProduct(id);
    if (!p) return;
    if (LIVE) {
        const r = await api('/api/staff/stop', 'POST', { productId: id, available });
        if (!r.ok) { toast('Не удалось обновить стоп-лист'); renderStopList(); return; }
    }
    p.available = available;
    document.getElementById('ss-' + id).textContent = available ? 'в наличии' : 'в стопе';
    renderMenu(); renderOwnerMenu();
    toast(p.name + (available ? ' — снова в меню' : ' — в стоп-лист'));
}

// ============================================================
//  Владелец
// ============================================================
function renderOwnerMenu() {
    const wrap = document.getElementById('owner-menu-list');
    if (!wrap) return;
    wrap.innerHTML = MENU.map((p) => `
        <div class="list-row">
            <div class="lr-ic">${cupArt()}</div>
            <div class="lr-main">
                <div class="lr-title">${p.name}</div>
                <div class="lr-sub">${p.categoryName}${p.available ? '' : ' · в стопе'}</div>
            </div>
            <div class="lr-price">${money(p.price)}</div>
        </div>`).join('');
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
function initTelegramShell() {
    if (!tg) return;
    try {
        tg.ready();
        tg.expand();
        // Отключаем «свайп вниз = свернуть» — иначе Telegram перехватывает
        // вертикальные жесты и внутри приложения ничего не прокручивается.
        if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
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

async function boot() {
    initTelegramShell();
    const logoMarkEl = document.getElementById('logo-mark');
    if (logoMarkEl) logoMarkEl.innerHTML = logoMark();

    if (tg && tg.initData && API_BASE && !API_BASE.includes('REPLACE-WITH')) {
        const r = await api('/api/bootstrap');
        if (r.ok) {
            LIVE = true; ROLE = r.data.role;
            if (r.data.tenant && Number.isFinite(r.data.tenant.deliveryFee)) DELIVERY_FEE = r.data.tenant.deliveryFee;
            if (r.data.tenant) PAYMENT_ONLINE = r.data.tenant.paymentMode === 'online';
            const catNameById = new Map(r.data.categories.map((c) => [c.id, c.name]));
            // Порядок категорий — как в бэкенде; в ленту попадают только непустые.
            const menuCatIds = new Set(r.data.menu.map((p) => p.categoryId));
            CATEGORIES_LIST = r.data.categories.filter((c) => menuCatIds.has(c.id)).map((c) => c.name);
            MENU = r.data.menu.map((p) => {
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
        } else {
            showAuthError(r);
            return;
        }
    } else {
        MENU = demoProducts();
        CATEGORIES_LIST = [...new Set(MENU.map((p) => p.categoryName))];
    }

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
                // Владелец/менеджер часто работает и за стойкой — оставляем
                // мини-переключатель «Бариста / Владелец» (без «Клиент»).
                switcher?.querySelector('#rs-client')?.remove();
                switchRole('owner');
                loadOwnerSummary(); loadOwnerTeam();   // сразу подтягиваем реальные цифры
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
