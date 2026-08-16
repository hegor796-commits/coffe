/* ============================================================
   Любовь-Морковь — прототип мини-приложения (демо-данные в памяти)
   Три роли: клиент, бариста, владелец. Живые взаимодействия:
   корзина, оформление, смена статусов заказа, стоп-лист.
   ============================================================ */

// ---- Палитра градиентов-подложек под фото (пока фото нет) ----
const TINT = {
    coffee:  'linear-gradient(135deg,#8B5E34,#5A3A22)',
    special: 'linear-gradient(135deg,#7FA06B,#4E7A54)',
    dessert: 'linear-gradient(135deg,#C98A5E,#A9541F)',
};

// ---- Меню ----
const PRODUCTS = [
    { id: 'cap',   name: 'Капучино',      price: 220, cat: 'coffee',  emoji: '☕' },
    { id: 'lat',   name: 'Латте',         price: 240, cat: 'coffee',  emoji: '☕' },
    { id: 'amer',  name: 'Американо',     price: 180, cat: 'coffee',  emoji: '☕' },
    { id: 'flat',  name: 'Флэт-уайт',     price: 260, cat: 'coffee',  emoji: '🥛' },
    { id: 'raf',   name: 'Раф ванильный', price: 280, cat: 'coffee',  emoji: '🥛' },
    { id: 'esp',   name: 'Эспрессо',      price: 130, cat: 'coffee',  emoji: '☕' },
    { id: 'match', name: 'Матча-латте',   price: 320, cat: 'special', emoji: '🍵' },
    { id: 'v60',   name: 'Фильтр V60',    price: 260, cat: 'special', emoji: '🫗' },
    { id: 'bumble',name: 'Бамбл',         price: 290, cat: 'special', emoji: '🍊' },
    { id: 'cacao', name: 'Какао',         price: 240, cat: 'special', emoji: '🍫' },
    { id: 'carrot',name: 'Морковный торт',price: 260, cat: 'dessert', emoji: '🥕' },
    { id: 'cheese',name: 'Чизкейк',       price: 290, cat: 'dessert', emoji: '🧀' },
    { id: 'crois', name: 'Круассан',      price: 180, cat: 'dessert', emoji: '🥐' },
];
const CAT_LABELS = { coffee: 'Кофе', special: 'Спешлти', dessert: 'Десерты' };

// ---- Состояние ----
let activeCat = 'all';
const cart = {};                 // id -> qty
let orderSeq = 4;                // следующий номер (А-4…)

// Демо-история клиента
const clientOrders = [
    { id: 'А-3', date: '14.08, 22:01', items: 'Капучино', total: 220, status: 'done', label: 'Выдан' },
    { id: 'А-2', date: '12.08, 09:14', items: 'Латте · Морковный торт', total: 500, status: 'done', label: 'Выдан' },
];

// Демо-лента бариста
let baristaOrders = [
    { id: 'А-7', ts: '09:41', customer: 'Аня', status: 'new',
      items: [{ q: 1, n: 'Капучино', m: 'M · растит. молоко' }, { q: 1, n: 'Морковный торт', m: '' }] },
    { id: 'А-6', ts: '09:37', customer: 'Игорь', status: 'preparing',
      items: [{ q: 2, n: 'Американо', m: 'L' }] },
    { id: 'А-5', ts: '09:33', customer: 'Лена', status: 'ready',
      items: [{ q: 1, n: 'Раф ванильный', m: 'M' }, { q: 1, n: 'Круассан', m: '' }] },
    { id: 'А-4', ts: '09:20', customer: 'Пётр', status: 'done',
      items: [{ q: 1, n: 'Эспрессо', m: '' }] },
];

// Стоп-лист (id -> в стопе?)
const stopState = {};

// Порядок статусов
const FLOW = {
    new:       { next: 'accepted',  btn: 'Принять',        cls: 'btn-primary' },
    accepted:  { next: 'preparing', btn: 'Начать готовить', cls: 'btn-advance' },
    preparing: { next: 'ready',     btn: 'Заказ готов',     cls: 'btn-advance' },
    ready:     { next: 'done',      btn: 'Выдать',          cls: 'btn-ready' },
};
const STATUS_LABEL = {
    new: 'Новый', accepted: 'Принят', preparing: 'Готовим',
    ready: 'Готов', done: 'Выдан', rejected: 'Отклонён',
};
const money = (n) => n.toLocaleString('ru-RU') + ' ₽';
const priceOf = (id) => (PRODUCTS.find((p) => p.id === id) || {}).price || 0;

// ============================================================
//  Навигация
// ============================================================
function switchRole(role) {
    document.querySelectorAll('.role-app').forEach((el) => el.classList.remove('active'));
    document.getElementById('role-' + role).classList.add('active');
    document.querySelectorAll('.role-switch button').forEach((b) => b.classList.remove('active'));
    document.getElementById('rs-' + role).classList.add('active');
    document.getElementById('role-badge').textContent =
        { client: 'Клиент', barista: 'Бариста', owner: 'Владелец' }[role];
}

function switchTab(role, tab) {
    const app = document.getElementById('role-' + role);
    app.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    app.querySelector('#view-' + role + '-' + tab).classList.add('active');
    app.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    app.querySelector('#nav-' + role + '-' + tab).classList.add('active');
}

// ============================================================
//  Клиент: меню
// ============================================================
function renderMenu() {
    const grid = document.getElementById('menu-grid');
    const items = PRODUCTS.filter((p) => activeCat === 'all' || p.cat === activeCat);
    grid.innerHTML = items.map((p) => {
        const out = stopState[p.id];
        return `
        <article class="menu-card ${out ? 'sold-out' : ''}">
            <div class="card-img" style="background-image:${TINT[p.cat]}">${p.emoji}</div>
            <div class="card-body">
                <h2 class="card-title">${p.name}</h2>
                <span class="card-price">${money(p.price)}</span>
                ${out
                    ? '<span class="card-soldout-label">Стоп</span>'
                    : `<button class="add-btn" onclick="addToCart('${p.id}')" aria-label="Добавить ${p.name}">+</button>`}
            </div>
        </article>`;
    }).join('');
}

function setCat(btn, cat) {
    activeCat = cat;
    btn.parentElement.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderMenu();
}

// ============================================================
//  Клиент: корзина
// ============================================================
function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    updateCartBadge();
    toast(PRODUCTS.find((p) => p.id === id).name + ' — в корзине');
}
function changeQty(id, d) {
    cart[id] = (cart[id] || 0) + d;
    if (cart[id] <= 0) delete cart[id];
    updateCartBadge();
    renderCart();
}
function cartCount() { return Object.values(cart).reduce((a, b) => a + b, 0); }
function cartTotal() { return Object.entries(cart).reduce((s, [id, q]) => s + priceOf(id) * q, 0); }

function updateCartBadge() {
    const b = document.getElementById('cart-badge');
    const n = cartCount();
    b.textContent = n;
    b.classList.toggle('show', n > 0);
}

function renderCart() {
    const wrap = document.getElementById('view-client-cart');
    const ids = Object.keys(cart);
    if (ids.length === 0) {
        wrap.innerHTML = `
            <div class="cart-empty-state">
                <div class="cart-illustration">🥕</div>
                <h2 class="cart-title">Заказ пуст</h2>
                <p class="cart-desc">Добавьте что-нибудь из меню, чтобы забрать без очереди.</p>
                <button class="main-btn ghost" style="width:auto" onclick="switchTab('client','menu')">Открыть меню</button>
            </div>`;
        return;
    }
    const rows = ids.map((id) => {
        const p = PRODUCTS.find((x) => x.id === id);
        return `
        <div class="cart-item">
            <div class="ci-emoji">${p.emoji}</div>
            <div class="ci-main">
                <div class="ci-name">${p.name}</div>
                <div class="ci-mods">${money(p.price)}</div>
            </div>
            <div class="qty">
                <button onclick="changeQty('${id}',-1)" aria-label="Меньше">−</button>
                <span>${cart[id]}</span>
                <button onclick="changeQty('${id}',1)" aria-label="Больше">+</button>
            </div>
        </div>`;
    }).join('');
    wrap.innerHTML = `
        <span class="section-eyebrow">Ваш заказ</span>
        <h1 class="page-title">Корзина</h1>
        <div class="cart-list">${rows}</div>
        <div class="cart-summary">
            <div class="cart-row"><span>Позиции</span><span>${cartCount()} шт.</span></div>
            <div class="cart-row"><span>Оплата</span><span>на кассе при получении</span></div>
            <div class="cart-row total"><span>Итого</span><span>${money(cartTotal())}</span></div>
        </div>
        <div class="checkout-bar">
            <button class="main-btn" onclick="checkout()">Оформить заказ · ${money(cartTotal())}</button>
        </div>`;
}

function checkout() {
    if (cartCount() === 0) return;
    const id = 'А-' + orderSeq++;
    const names = Object.keys(cart).map((k) => PRODUCTS.find((p) => p.id === k).name);
    const total = cartTotal();
    // в историю клиента
    clientOrders.unshift({
        id, date: 'сейчас', items: names.join(' · '), total, status: 'preparing', label: 'В работе',
    });
    // в ленту бариста
    baristaOrders.unshift({
        id, ts: 'сейчас', customer: 'Вы', status: 'new',
        items: Object.entries(cart).map(([k, q]) => ({ q, n: PRODUCTS.find((p) => p.id === k).name, m: '' })),
    });
    Object.keys(cart).forEach((k) => delete cart[k]);
    updateCartBadge();
    renderCart();
    renderClientOrders();
    renderBarista();
    toast('Заказ ' + id + ' оформлен ✓');
    switchTab('client', 'orders');
}

function renderClientOrders() {
    const list = document.getElementById('client-orders-list');
    list.innerHTML = clientOrders.map((o) => `
        <div class="order-card">
            <div class="order-info">
                <span class="order-id">Заказ ${o.id}</span>
                <span class="order-date">${o.date}</span>
                <span class="order-items-line">${o.items}</span>
            </div>
            <div class="order-status-wrap">
                <span class="order-price">${money(o.total)}</span>
                <span class="order-status status-${o.status}">${o.label}</span>
            </div>
        </div>`).join('');
}

// ============================================================
//  Бариста
// ============================================================
let baristaFilter = 'active';

function setBaristaFilter(btn, f) {
    baristaFilter = f;
    btn.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    renderBarista();
}

function renderBarista() {
    const active = ['new', 'accepted', 'preparing', 'ready'];
    const feed = document.getElementById('barista-feed');
    let list = baristaOrders.filter((o) => active.includes(o.status));
    if (baristaFilter === 'new') list = list.filter((o) => o.status === 'new');
    else if (baristaFilter === 'work') list = list.filter((o) => o.status === 'accepted' || o.status === 'preparing');
    else if (baristaFilter === 'ready') list = list.filter((o) => o.status === 'ready');

    document.getElementById('feed-count').textContent = baristaOrders.filter((o) => active.includes(o.status)).length;

    feed.innerHTML = list.length ? list.map(ticketHTML).join('')
        : '<div class="empty-note">Активных заказов нет.<br>Новые появятся здесь автоматически.</div>';

    // архив
    const arch = document.getElementById('barista-archive');
    if (arch) {
        const done = baristaOrders.filter((o) => o.status === 'done' || o.status === 'rejected');
        arch.innerHTML = done.length ? done.map((o) => `
            <div class="order-card">
                <div class="order-info">
                    <span class="order-id">Заказ ${o.id}</span>
                    <span class="order-date">${o.ts} · ${o.customer}</span>
                </div>
                <span class="status-pill status-${o.status}">${STATUS_LABEL[o.status]}</span>
            </div>`).join('') : '<div class="empty-note">Архив пуст.</div>';
    }
}

function ticketHTML(o) {
    const lines = o.items.map((it) => `
        <li>
            <span><span class="ln-qty">${it.q}×</span>${it.n}${it.m ? ` <span class="ln-mods">· ${it.m}</span>` : ''}</span>
        </li>`).join('');
    const total = o.items.reduce((s, it) => {
        const p = PRODUCTS.find((x) => x.n === it.n) || PRODUCTS.find((x) => x.name === it.n);
        return s + (p ? p.price : 0) * it.q;
    }, 0);
    const flow = FLOW[o.status];
    let actions = '';
    if (o.status === 'new') {
        actions = `
            <button class="btn-sm btn-ghost" onclick="rejectOrder('${o.id}')">Отклонить</button>
            <button class="btn-sm ${flow.cls}" onclick="advanceOrder('${o.id}')">${flow.btn}</button>`;
    } else if (flow) {
        actions = `<button class="btn-sm ${flow.cls}" onclick="advanceOrder('${o.id}')">${flow.btn}</button>`;
    }
    return `
    <div class="ticket" data-status="${o.status}">
        <div class="ticket-head">
            <div class="ticket-num">${o.id} <small>${o.customer}</small></div>
            <span class="status-pill status-${o.status}">${STATUS_LABEL[o.status]}</span>
        </div>
        <ul class="ticket-lines">${lines}</ul>
        <div class="ticket-foot">
            <span class="ticket-total">${money(total)}</span>
            <span class="timer">⏱ ${o.ts}</span>
            ${actions}
        </div>
    </div>`;
}

function advanceOrder(id) {
    const o = baristaOrders.find((x) => x.id === id);
    if (!o || !FLOW[o.status]) return;
    o.status = FLOW[o.status].next;
    // синхронизируем со статусом в истории клиента
    const co = clientOrders.find((c) => c.id === id);
    if (co) {
        co.status = o.status === 'done' ? 'done' : (o.status === 'ready' ? 'ready' : 'preparing');
        co.label = STATUS_LABEL[o.status];
    }
    renderBarista();
    renderClientOrders();
    toast('Заказ ' + id + ' → ' + STATUS_LABEL[o.status]);
}

function rejectOrder(id) {
    const o = baristaOrders.find((x) => x.id === id);
    if (!o) return;
    o.status = 'rejected';
    const co = clientOrders.find((c) => c.id === id);
    if (co) { co.status = 'rejected'; co.label = 'Отклонён'; }
    renderBarista();
    renderClientOrders();
    toast('Заказ ' + id + ' отклонён');
}

// ============================================================
//  Стоп-лист
// ============================================================
function renderStopList() {
    const wrap = document.getElementById('stop-list');
    wrap.innerHTML = PRODUCTS.map((p) => `
        <div class="stop-row">
            <span class="sr-emoji">${p.emoji}</span>
            <span class="sr-name">${p.name}</span>
            <span class="sr-state" id="ss-${p.id}">${stopState[p.id] ? 'в стопе' : 'в наличии'}</span>
            <label class="switch">
                <input type="checkbox" ${stopState[p.id] ? '' : 'checked'} onchange="toggleStop('${p.id}',this.checked)">
                <span class="slider"></span>
            </label>
        </div>`).join('');
}
function toggleStop(id, available) {
    stopState[id] = !available;
    document.getElementById('ss-' + id).textContent = available ? 'в наличии' : 'в стопе';
    renderMenu();
    renderOwnerMenu();
    toast(PRODUCTS.find((p) => p.id === id).name + (available ? ' — снова в меню' : ' — в стоп-лист'));
}

// ============================================================
//  Владелец: меню
// ============================================================
function renderOwnerMenu() {
    const wrap = document.getElementById('owner-menu-list');
    if (!wrap) return;
    wrap.innerHTML = PRODUCTS.map((p) => `
        <div class="list-row">
            <div class="lr-emoji">${p.emoji}</div>
            <div class="lr-main">
                <div class="lr-title">${p.name}</div>
                <div class="lr-sub">${CAT_LABELS[p.cat]}${stopState[p.id] ? ' · в стопе' : ''}</div>
            </div>
            <div class="lr-right"><div class="lr-price">${money(p.price)}</div></div>
        </div>`).join('');
}

// ============================================================
//  Тост
// ============================================================
let toastTimer;
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

// ============================================================
//  Инициализация
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    renderCart();
    renderClientOrders();
    renderBarista();
    renderStopList();
    renderOwnerMenu();
    updateCartBadge();
    switchRole('client');
});
