/* ============================================================
   ЛЮБОВЬ-МАРКОВЬ — прототип мини-приложения (демо-данные в памяти)
   Роли: клиент, бариста, владелец. Живые взаимодействия:
   поиск, корзина, оформление, смена статусов заказа, стоп-лист.
   ============================================================ */

// ---------- Рисованная графика (SVG) ----------
function logoMark() {
    return `<svg class="mark" viewBox="0 0 130 82" fill="none" stroke="currentColor"
        stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <!-- пара, сидящая в обнимку (со спины) -->
        <path d="M30 74 C28 56 33 47 43 47 C50 47 54 53 53 74"/>
        <path d="M50 74 C49 53 57 45 67 46 C77 47 79 57 77 74"/>
        <circle cx="43" cy="39" r="7.5"/>
        <circle cx="63" cy="37" r="7.5"/>
        <path d="M62 45 C57 41 50 42 47 46"/>
        <!-- сердечко -->
        <path d="M55 18 C53 14 47 15 47 20 C47 24 53 27 55 29 C57 27 63 24 63 20 C63 15 57 14 55 18Z"/>
        <!-- чашка кофе -->
        <path d="M95 50 L119 50 L117 60 C116 65 98 65 97 60 Z"/>
        <path d="M119 52 C126 52 126 60 118 60"/>
        <ellipse cx="107" cy="66" rx="15" ry="2.6"/>
        <path d="M100 42 C98 39 102 37 100 34"/>
        <path d="M108 42 C106 39 110 37 108 34"/>
    </svg>`;
}
function cupArt() {
    return `<svg width="86" height="70" viewBox="0 0 100 82" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M38 12 C35 17 41 20 38 26"/>
        <path d="M50 9 C47 15 53 18 50 25"/>
        <path d="M62 12 C59 17 65 20 62 26"/>
        <ellipse cx="50" cy="36" rx="24" ry="6"/>
        <path d="M26 36 C26 54 31 62 50 62 C69 62 74 54 74 36"/>
        <path d="M74 40 C88 40 88 56 73 55"/>
        <ellipse cx="50" cy="68" rx="31" ry="4"/>
        <path d="M31 37 C33 47 40 52 50 52 C60 52 67 47 69 37" opacity="0.5"/>
    </svg>`;
}
function engravingCup() {
    return `<svg class="engraving" width="150" height="132" viewBox="0 0 100 90" fill="none"
        stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M37 8 C33 15 41 19 37 27"/>
        <path d="M50 5 C46 13 54 17 50 26"/>
        <path d="M63 8 C59 15 67 19 63 27"/>
        <ellipse cx="50" cy="37" rx="26" ry="6.5"/>
        <ellipse cx="50" cy="37" rx="21" ry="4.6" opacity="0.55"/>
        <path d="M24 37 C24 57 30 66 50 66 C70 66 76 57 76 37"/>
        <path d="M76 41 C92 41 92 60 75 58"/>
        <ellipse cx="50" cy="73" rx="34" ry="4.6"/>
        <ellipse cx="50" cy="73" rx="27" ry="3" opacity="0.5"/>
        <path d="M30 79 C36 84 64 84 70 79" opacity="0.6"/>
    </svg>`;
}
const IC = {
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>`,
    sliders: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h11M19 8h1M4 16h5M13 16h7"/><circle cx="16" cy="8" r="2.4"/><circle cx="10" cy="16" r="2.4"/></svg>`,
    cup: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"/><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M8 3v2M12 3v2"/></svg>`,
    leaf: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16z"/><path d="M9 15c3-3 6-4 8-4"/></svg>`,
    cake: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20h16v-7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3z"/><path d="M4 15c2 1.5 3 1.5 5 0s3-1.5 5 0 3 1.5 6 0"/><path d="M12 4v3"/></svg>`,
    book: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 12h6"/></svg>`,
    pin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
    crown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l3 9h10l3-9-5 4-3-6-3 6z"/></svg>`,
    apron: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4a3 3 0 0 0 6 0"/><path d="M8 5C5 6 5 9 7 11l-1 8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l-1-8c2-2 2-5-1-6"/></svg>`,
};

// ---------- Меню ----------
const PRODUCTS = [
    { id: 'cap',   name: 'Капучино',      price: 220, cat: 'coffee'  },
    { id: 'lat',   name: 'Латте',         price: 240, cat: 'coffee'  },
    { id: 'amer',  name: 'Американо',     price: 180, cat: 'coffee'  },
    { id: 'flat',  name: 'Флэт-уайт',     price: 260, cat: 'coffee'  },
    { id: 'raf',   name: 'Раф ванильный', price: 280, cat: 'coffee'  },
    { id: 'esp',   name: 'Эспрессо',      price: 130, cat: 'coffee'  },
    { id: 'match', name: 'Матча-латте',   price: 320, cat: 'special' },
    { id: 'v60',   name: 'Фильтр V60',    price: 260, cat: 'special' },
    { id: 'bumble',name: 'Бамбл',         price: 290, cat: 'special' },
    { id: 'cacao', name: 'Какао',         price: 240, cat: 'special' },
    { id: 'carrot',name: 'Морковный торт',price: 260, cat: 'dessert' },
    { id: 'cheese',name: 'Чизкейк',       price: 290, cat: 'dessert' },
    { id: 'crois', name: 'Круассан',      price: 180, cat: 'dessert' },
];
const CAT_LABELS = { coffee: 'Кофе', special: 'Спешлти', dessert: 'Десерты' };

// ---------- Состояние ----------
let activeCat = 'all';
let query = '';
const cart = {};
let orderSeq = 4;

const clientOrders = [
    { id: 'А-3', date: '14.08, 22:01', items: 'Капучино', total: 220, status: 'done', label: 'Выдан' },
    { id: 'А-2', date: '12.08, 09:14', items: 'Латте · Морковный торт', total: 500, status: 'done', label: 'Выдан' },
];
let baristaOrders = [
    { id: 'А-7', ts: '09:41', customer: 'Аня',   status: 'new',
      items: [{ q: 1, n: 'Капучино', m: 'M · растит. молоко' }, { q: 1, n: 'Морковный торт', m: '' }] },
    { id: 'А-6', ts: '09:37', customer: 'Игорь', status: 'preparing', items: [{ q: 2, n: 'Американо', m: 'L' }] },
    { id: 'А-5', ts: '09:33', customer: 'Лена',  status: 'ready',
      items: [{ q: 1, n: 'Раф ванильный', m: 'M' }, { q: 1, n: 'Круассан', m: '' }] },
    { id: 'А-4', ts: '09:20', customer: 'Пётр',  status: 'done', items: [{ q: 1, n: 'Эспрессо', m: '' }] },
];
const stopState = {};

const FLOW = {
    new:       { next: 'accepted',  btn: 'Принять',         cls: 'btn-primary' },
    accepted:  { next: 'preparing', btn: 'Начать готовить', cls: 'btn-advance' },
    preparing: { next: 'ready',     btn: 'Заказ готов',     cls: 'btn-advance' },
    ready:     { next: 'done',      btn: 'Выдать',          cls: 'btn-ready' },
};
const STATUS_LABEL = { new: 'Новый', accepted: 'Принят', preparing: 'Готовим', ready: 'Готов', done: 'Выдан', rejected: 'Отклонён' };
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
}
function switchTab(role, tab) {
    const app = document.getElementById('role-' + role);
    app.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    app.querySelector('#view-' + role + '-' + tab).classList.add('active');
    app.querySelectorAll('.tab').forEach((n) => n.classList.remove('active'));
    app.querySelector('#tab-' + role + '-' + tab).classList.add('active');
}

// ============================================================
//  Клиент: меню
// ============================================================
function renderMenu() {
    const grid = document.getElementById('menu-grid');
    const q = query.trim().toLowerCase();
    const items = PRODUCTS.filter((p) =>
        (activeCat === 'all' || p.cat === activeCat) && (!q || p.name.toLowerCase().includes(q)));
    if (!items.length) { grid.innerHTML = '<div class="empty-note" style="grid-column:1/-1">Ничего не найдено</div>'; return; }
    grid.innerHTML = items.map((p) => {
        const out = stopState[p.id];
        return `
        <article class="menu-card ${out ? 'sold-out' : ''}">
            <div class="card-img cat-${p.cat}">${cupArt()}</div>
            <div class="card-body">
                <h2 class="card-title">${p.name}</h2>
                <span class="card-price">${money(p.price)}</span>
                ${out ? '<span class="card-soldout">Стоп</span>'
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
function setSearch(v) { query = v; renderMenu(); }

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
    updateCartBadge(); renderCart();
}
function cartCount() { return Object.values(cart).reduce((a, b) => a + b, 0); }
function cartTotal() { return Object.entries(cart).reduce((s, [id, q]) => s + priceOf(id) * q, 0); }
function updateCartBadge() {
    const b = document.getElementById('cart-badge');
    const n = cartCount();
    b.textContent = n; b.classList.toggle('show', n > 0);
}
function renderCart() {
    const wrap = document.getElementById('view-client-cart');
    const ids = Object.keys(cart);
    if (!ids.length) {
        wrap.innerHTML = `
            <div class="brand-bar"><div class="wordmark">ЛЮБОВЬ-МАРКОВЬ</div><div class="rule"></div></div>
            <div class="empty">
                ${engravingCup()}
                <h2>Заказ пуст</h2>
                <p>Добавьте что-нибудь из меню,<br>чтобы забрать без очереди.</p>
                <button class="main-btn auto" onclick="switchTab('client','menu')">Открыть меню</button>
            </div>`;
        return;
    }
    const rows = ids.map((id) => {
        const p = PRODUCTS.find((x) => x.id === id);
        return `
        <div class="cart-item">
            <div class="ci-thumb">${cupArt()}</div>
            <div class="ci-main">
                <div class="ci-name">${p.name}</div>
                <div class="ci-price">${money(p.price)}</div>
            </div>
            <div class="qty">
                <button onclick="changeQty('${id}',-1)" aria-label="Меньше">−</button>
                <span>${cart[id]}</span>
                <button onclick="changeQty('${id}',1)" aria-label="Больше">+</button>
            </div>
        </div>`;
    }).join('');
    wrap.innerHTML = `
        <div class="brand-bar"><div class="wordmark">ЛЮБОВЬ-МАРКОВЬ</div><div class="rule"></div></div>
        <span class="eyebrow">Ваш заказ</span>
        <h1 class="page-title">Корзина</h1>
        <div class="cart-list">${rows}</div>
        <div class="summary">
            <div class="row"><span>Позиции</span><span>${cartCount()} шт.</span></div>
            <div class="row"><span>Оплата</span><span>на кассе при получении</span></div>
            <div class="row total"><span>Итого</span><span>${money(cartTotal())}</span></div>
        </div>
        <div class="checkout"><button class="main-btn" onclick="checkout()">Оформить заказ · ${money(cartTotal())}</button></div>`;
}
function checkout() {
    if (!cartCount()) return;
    const id = 'А-' + orderSeq++;
    const names = Object.keys(cart).map((k) => PRODUCTS.find((p) => p.id === k).name);
    const total = cartTotal();
    clientOrders.unshift({ id, date: 'сейчас', items: names.join(' · '), total, status: 'preparing', label: 'В работе' });
    baristaOrders.unshift({ id, ts: 'сейчас', customer: 'Вы', status: 'new',
        items: Object.entries(cart).map(([k, q]) => ({ q, n: PRODUCTS.find((p) => p.id === k).name, m: '' })) });
    Object.keys(cart).forEach((k) => delete cart[k]);
    updateCartBadge(); renderCart(); renderClientOrders(); renderBarista();
    toast('Заказ ' + id + ' оформлен ✓');
    switchTab('client', 'orders');
}
function renderClientOrders() {
    document.getElementById('client-orders-list').innerHTML = clientOrders.map((o) => `
        <div class="order-card">
            <div class="order-left">
                <span class="order-ic">${IC.book}</span>
                <div class="order-info">
                    <span class="order-id">Заказ ${o.id}</span>
                    <span class="order-date">${o.date}</span>
                    <span class="order-items">${o.items}</span>
                </div>
            </div>
            <div class="order-right">
                <span class="order-price">${money(o.total)}</span>
                <span class="pill st-${o.status}">${o.label}</span>
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
    let list = baristaOrders.filter((o) => active.includes(o.status));
    if (baristaFilter === 'new') list = list.filter((o) => o.status === 'new');
    else if (baristaFilter === 'work') list = list.filter((o) => o.status === 'accepted' || o.status === 'preparing');
    else if (baristaFilter === 'ready') list = list.filter((o) => o.status === 'ready');
    document.getElementById('feed-count').textContent = baristaOrders.filter((o) => active.includes(o.status)).length;

    document.getElementById('barista-feed').innerHTML = list.length ? list.map(ticketHTML).join('')
        : '<div class="empty-note">Активных заказов нет.<br>Новые появятся здесь автоматически.</div>';

    const done = baristaOrders.filter((o) => o.status === 'done' || o.status === 'rejected');
    document.getElementById('barista-archive').innerHTML = done.length ? done.map((o) => `
        <div class="order-card">
            <div class="order-left"><span class="order-ic">${IC.book}</span>
                <div class="order-info"><span class="order-id">Заказ ${o.id}</span><span class="order-date">${o.ts} · ${o.customer}</span></div>
            </div>
            <span class="pill st-${o.status}">${STATUS_LABEL[o.status]}</span>
        </div>`).join('') : '<div class="empty-note">Архив пуст.</div>';
}
function ticketHTML(o) {
    const lines = o.items.map((it) => `<li><span class="ln-qty">${it.q}×</span>${it.n}${it.m ? ` <span class="ln-mods">· ${it.m}</span>` : ''}</li>`).join('');
    const total = o.items.reduce((s, it) => { const p = PRODUCTS.find((x) => x.name === it.n); return s + (p ? p.price : 0) * it.q; }, 0);
    const flow = FLOW[o.status];
    let actions = '';
    if (o.status === 'new') {
        actions = `<button class="btn-sm btn-ghost" onclick="rejectOrder('${o.id}')">Отклонить</button>
                   <button class="btn-sm ${flow.cls}" onclick="advanceOrder('${o.id}')">${flow.btn}</button>`;
    } else if (flow) {
        actions = `<button class="btn-sm ${flow.cls}" onclick="advanceOrder('${o.id}')">${flow.btn}</button>`;
    }
    return `
    <div class="ticket" data-status="${o.status}">
        <div class="ticket-head">
            <div class="ticket-num">${o.id} <small>${o.customer}</small></div>
            <span class="pill st-${o.status}">${STATUS_LABEL[o.status]}</span>
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
    const co = clientOrders.find((c) => c.id === id);
    if (co) { co.status = o.status === 'done' ? 'done' : (o.status === 'ready' ? 'ready' : 'preparing'); co.label = STATUS_LABEL[o.status]; }
    renderBarista(); renderClientOrders();
    toast('Заказ ' + id + ' → ' + STATUS_LABEL[o.status]);
}
function rejectOrder(id) {
    const o = baristaOrders.find((x) => x.id === id);
    if (!o) return;
    o.status = 'rejected';
    const co = clientOrders.find((c) => c.id === id);
    if (co) { co.status = 'rejected'; co.label = 'Отклонён'; }
    renderBarista(); renderClientOrders();
    toast('Заказ ' + id + ' отклонён');
}

// ============================================================
//  Стоп-лист
// ============================================================
function renderStopList() {
    document.getElementById('stop-list').innerHTML = PRODUCTS.map((p) => `
        <div class="stop-row">
            <span class="thumb">${cupArt()}</span>
            <span class="sr-name">${p.name}</span>
            <span class="sr-state" id="ss-${p.id}">${stopState[p.id] ? 'в стопе' : 'в наличии'}</span>
            <label class="switch">
                <input type="checkbox" ${stopState[p.id] ? '' : 'checked'} onchange="toggleStop('${p.id}',this.checked)" aria-label="${p.name}">
                <span class="slider"></span>
            </label>
        </div>`).join('');
}
function toggleStop(id, available) {
    stopState[id] = !available;
    document.getElementById('ss-' + id).textContent = available ? 'в наличии' : 'в стопе';
    renderMenu(); renderOwnerMenu();
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
            <div class="lr-ic">${IC.cup}</div>
            <div class="lr-main">
                <div class="lr-title">${p.name}</div>
                <div class="lr-sub">${CAT_LABELS[p.cat]}${stopState[p.id] ? ' · в стопе' : ''}</div>
            </div>
            <div class="lr-price">${money(p.price)}</div>
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
//  Инициализация
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logo-mark').innerHTML = logoMark();
    renderMenu(); renderCart(); renderClientOrders();
    renderBarista(); renderStopList(); renderOwnerMenu();
    updateCartBadge();
    switchRole('client');
});
