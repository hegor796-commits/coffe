/* ============================================================
   Любовь-Марковь — прототип мини-приложения (демо-данные в памяти)
   Роли: клиент, бариста, владелец. Живые взаимодействия:
   поиск, корзина, оформление, смена статусов заказа, стоп-лист.
   ============================================================ */

// ---------- Рисованная графика (SVG) ----------
function logoMark() {
    return `<svg class="mark" viewBox="58 28 168 120" fill="none" stroke="currentColor"
        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <!-- земля -->
        <path d="M66 133 C104 140 150 140 168 132" stroke-width="1.3" opacity="0.5"/>
        <!-- левый (худи), сидит -->
        <path d="M70 131 C63 104 72 74 92 74 C108 74 114 100 110 126 C109 130 105 132 100 132 L77 132 C73 132 70 132 70 131 Z"/>
        <circle cx="90" cy="53" r="14.5"/>
        <path d="M77 98 C88 92 101 95 107 104" stroke-width="1.4" opacity="0.6"/>
        <!-- правая (платье), сидит: юбка веером -->
        <path d="M104 129 C99 104 108 76 125 78 C143 80 153 104 153 124 C153 130 149 132 142 132 L110 132 C106 132 104 131 104 129 Z"/>
        <circle cx="121" cy="59" r="12.5"/>
        <path d="M111 52 C113 48 117 47 121 48" stroke-width="1.3" opacity="0.6"/>
        <path d="M120 96 C120 110 119 122 119 131" stroke-width="1.2" opacity="0.4"/>
        <path d="M136 96 C138 110 140 122 140 131" stroke-width="1.2" opacity="0.4"/>
        <!-- рука через плечо + кисть -->
        <path d="M100 70 C115 60 132 64 140 79"/>
        <path d="M140 79 l-4 4 M140 79 l0 5 M140 79 l5 2" stroke-width="1.6"/>
        <!-- ступни -->
        <path d="M84 132 l-6 4 M122 132 l6 4 M104 132 l1 5" stroke-width="1.7"/>
        <!-- сердце -->
        <path d="M156 40 C154 33 145 33 145 41 C145 49 156 55 156 55 C156 55 167 49 167 41 C167 33 158 33 156 40 Z" stroke-width="1.7"/>
        <!-- чашка кофе -->
        <ellipse cx="192" cy="96" rx="12" ry="3.2"/>
        <path d="M180 96 C180 110 204 110 204 96"/>
        <path d="M204 99 C212 99 212 107 203 106"/>
        <path d="M173 114 C176 118 208 118 211 114"/>
        <path d="M185 90 C183 84 189 81 187 75" stroke-width="1.5"/>
        <path d="M195 90 C193 84 199 81 197 75" stroke-width="1.5"/>
    </svg>`;
}
function cupArt() {
    // Современная плоская чашка (для плиток и миниатюр)
    return `<svg width="72" height="60" viewBox="0 0 58 50" fill="none" stroke="currentColor"
        stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 19 H41 V27 C41 36 34 42 26 42 C18 42 11 36 11 27 Z"/>
        <path d="M41 23 C49 23 49 35 41 34"/>
        <path d="M19 5 C17 8 21 10 19 13 M26 4 C24 7 28 9 26 12 M33 5 C31 8 35 10 33 13" stroke-width="2.6"/>
    </svg>`;
}
function engravingCup() {
    // Крупная дружелюбная чашка для пустого состояния
    return `<svg width="70" height="66" viewBox="0 0 64 60" fill="none" stroke="currentColor"
        stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 22 H44 V31 C44 41 36 48 28 48 C20 48 12 41 12 31 Z"/>
        <path d="M44 26 C53 26 53 39 44 38"/>
        <path d="M8 52 C16 56 40 56 48 52"/>
        <path d="M20 5 C18 9 22 11 20 15 M28 4 C26 8 30 10 28 14 M36 5 C34 9 38 11 36 15" stroke-width="2.8"/>
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

// ---------- Модификаторы (как в модели бэкенда) ----------
const SIZES = [{ n: 'S · 250 мл', d: 0 }, { n: 'M · 350 мл', d: 40 }, { n: 'L · 450 мл', d: 70 }];
const MILKS = [{ n: 'Обычное', d: 0 }, { n: 'Растительное', d: 50 }, { n: 'Банановое', d: 60 }];
const hasMods = (p) => p.cat === 'coffee' || p.cat === 'special';

// ---------- Состояние ----------
let activeCat = 'all';
let query = '';
// корзина: ключ = `${id}|${sizeIdx}|${milkIdx}` -> { id, name, mods, unit, qty }
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
        const open = out ? '' : `onclick="openSheet('${p.id}')"`;
        return `
        <article class="menu-card ${out ? 'sold-out' : ''}">
            <div class="card-img cat-${p.cat}" ${open}>${cupArt()}</div>
            <div class="card-body" ${open}>
                <h2 class="card-title">${p.name}</h2>
                <span class="card-price">${money(p.price)}</span>
                ${out ? '<span class="card-soldout">Стоп</span>'
                      : `<button class="add-btn" onclick="event.stopPropagation();addSimple('${p.id}')" aria-label="Добавить ${p.name}">+</button>`}
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
//  Клиент: карточка товара (нижняя шторка с модификаторами)
// ============================================================
let sheet = null;
function modsText(p, size, milk) {
    if (!hasMods(p)) return '';
    const parts = [SIZES[size].n.split(' · ')[0]];
    if (milk > 0) parts.push(MILKS[milk].n.toLowerCase());
    return parts.join(' · ');
}
function unitPrice(p, size, milk) {
    return p.price + (hasMods(p) ? SIZES[size].d + MILKS[milk].d : 0);
}
function openSheet(id) {
    sheet = { id, size: 1, milk: 0, qty: 1 };
    renderSheet();
}
function closeSheet() {
    const el = document.getElementById('sheet');
    el.classList.remove('show');
    setTimeout(() => { el.innerHTML = ''; }, 260);
    sheet = null;
}
function selSize(i) { sheet.size = i; renderSheet(); }
function selMilk(i) { sheet.milk = i; renderSheet(); }
function sheetQty(d) { sheet.qty = Math.max(1, sheet.qty + d); renderSheet(); }
function renderSheet() {
    const p = PRODUCTS.find((x) => x.id === sheet.id);
    const el = document.getElementById('sheet');
    const chips = (arr, sel, fn) => arr.map((o, i) =>
        `<button class="opt ${i === sel ? 'on' : ''}" onclick="${fn}(${i})">
            <span>${o.n}</span>${o.d ? `<b>+${o.d} ₽</b>` : ''}
        </button>`).join('');
    const unit = unitPrice(p, sheet.size, sheet.milk);
    el.innerHTML = `
        <div class="sheet-scrim" onclick="closeSheet()"></div>
        <div class="sheet-panel">
            <div class="sheet-grab"></div>
            <div class="sheet-head">
                <div class="sheet-thumb cat-${p.cat}">${cupArt()}</div>
                <div><div class="sheet-name">${p.name}</div><div class="sheet-base">${money(p.price)} · базовая</div></div>
                <button class="sheet-x" onclick="closeSheet()" aria-label="Закрыть">✕</button>
            </div>
            ${hasMods(p) ? `
            <div class="opt-group"><div class="opt-label">Размер</div><div class="opts">${chips(SIZES, sheet.size, 'selSize')}</div></div>
            <div class="opt-group"><div class="opt-label">Молоко</div><div class="opts">${chips(MILKS, sheet.milk, 'selMilk')}</div></div>`
            : '<div class="opt-note">Без дополнительных опций</div>'}
            <div class="sheet-foot">
                <div class="qty">
                    <button onclick="sheetQty(-1)" aria-label="Меньше">−</button>
                    <span>${sheet.qty}</span>
                    <button onclick="sheetQty(1)" aria-label="Больше">+</button>
                </div>
                <button class="main-btn" onclick="addConfigured()">Добавить · ${money(unit * sheet.qty)}</button>
            </div>
        </div>`;
    requestAnimationFrame(() => el.classList.add('show'));
}
function addConfigured() {
    const s = sheet;
    addLine(s.id, s.size, s.milk, s.qty);
    const p = PRODUCTS.find((x) => x.id === s.id);
    closeSheet();
    toast(p.name + ' — в корзине');
}

// ============================================================
//  Клиент: корзина
// ============================================================
function addSimple(id) {
    const p = PRODUCTS.find((x) => x.id === id);
    addLine(id, hasMods(p) ? 1 : 0, 0, 1);
    updateCartBadge();
    toast(p.name + ' — в корзине');
}
function addLine(id, size, milk, qty) {
    const p = PRODUCTS.find((x) => x.id === id);
    const key = `${id}|${hasMods(p) ? size : ''}|${hasMods(p) ? milk : ''}`;
    if (cart[key]) cart[key].qty += qty;
    else cart[key] = { id, name: p.name, mods: modsText(p, size, milk), unit: unitPrice(p, size, milk), qty };
    updateCartBadge();
}
function changeQty(key, d) {
    if (!cart[key]) return;
    cart[key].qty += d;
    if (cart[key].qty <= 0) delete cart[key];
    updateCartBadge(); renderCart();
}
function cartCount() { return Object.values(cart).reduce((s, v) => s + v.qty, 0); }
function cartTotal() { return Object.values(cart).reduce((s, v) => s + v.unit * v.qty, 0); }
function updateCartBadge() {
    const b = document.getElementById('cart-badge');
    const n = cartCount();
    b.textContent = n; b.classList.toggle('show', n > 0);
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
        const p = PRODUCTS.find((x) => x.id === v.id);
        return `
        <div class="cart-item">
            <div class="ci-thumb cat-${p.cat}">${cupArt()}</div>
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
    wrap.innerHTML = `
        <div class="brand-bar"><div class="wordmark">Любовь-Марковь</div></div>
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
    const vals = Object.values(cart);
    const total = cartTotal();
    clientOrders.unshift({ id, date: 'сейчас', items: vals.map((v) => v.name).join(' · '), total, status: 'preparing', label: 'В работе' });
    baristaOrders.unshift({ id, ts: 'сейчас', customer: 'Вы', status: 'new',
        items: vals.map((v) => ({ q: v.qty, n: v.name, m: v.mods })) });
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
