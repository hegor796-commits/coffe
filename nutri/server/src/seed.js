// Идемпотентный сев кофейни «Любовь-Марковь» — реальное меню.
// Позиции с размерами объединены в одну карточку с группой «Объём».
// Допы (молоко, сиропы, добавки) — общие группы модификаторов.
import crypto from 'node:crypto';
import { db, now } from './db.js';

const uid = () => crypto.randomUUID();

const CATEGORIES = [
  ['кофе',               'Кофе',               0],
  ['авторский кофе',     'Авторский кофе',     1],
  ['холодный кофе',      'Холодный кофе',      2],
  ['спешелти',           'Спешлти',            3],
  ['не кофе',            'Не кофе',            4],
  ['чай',                'Чай',                5],
  ['напитки',            'Напитки',            6],
  ['еда',                'Еда',                7],
  ['десерты',            'Десерты',            8],
  ['десерты без сахара', 'Десерты без сахара', 9],
  ['десерты веган',      'Десерты веган',      10],
  ['вафли',              'Вафли',              11],
  ['сладкие мелочи',     'Сладкие мелочи',     12],
];

function insertGroup(tenantId, name, required, minSelect, maxSelect, options) {
  const gid = uid();
  db.prepare(
    'INSERT INTO modifier_groups (id, tenant_id, name, required, min_select, max_select) VALUES (?,?,?,?,?,?)',
  ).run(gid, tenantId, name, required ? 1 : 0, minSelect, maxSelect);
  options.forEach(([optName, delta, isDefault], i) => {
    db.prepare(
      'INSERT INTO modifier_options (id, group_id, name, price_delta_rub, is_default, sort) VALUES (?,?,?,?,?,?)',
    ).run(uid(), gid, optName, delta, isDefault ? 1 : 0, i);
  });
  return gid;
}

function insertProduct(tenantId, catId, name, price, sort, groupIds = [], description = '', photoUrl = null) {
  const pid = uid();
  db.prepare(
    'INSERT INTO products (id, tenant_id, category_id, name, description, price_rub, photo_url, sort) VALUES (?,?,?,?,?,?,?,?)',
  ).run(pid, tenantId, catId, name, description || null, price, photoUrl, sort);
  groupIds.forEach((gid, i) => {
    db.prepare('INSERT INTO product_modifier_groups (product_id, group_id, sort) VALUES (?,?,?)').run(pid, gid, i);
  });
  return pid;
}

// Фото товаров: имя позиции в меню -> файл в design/img.
// Список применяется при каждом старте, поэтому новые снимки подхватываются
// без пересоздания базы — достаточно добавить строку и залить картинку.
const PHOTO_MAP = [
  // Кофе
  ['Американо',                      'img/americano.jpg'],
  ['Капучино',                       'img/cappuccino.jpg'],
  ['Латте',                          'img/latte.jpg'],
  ['Раф',                            'img/raf.jpg'],
  // Десерты
  ['Капкейк',                        'img/kapkeik.jpg'],
  ['Наполеон пирожное',              'img/napoleon.jpg'],
  ['Пирожное сердце малина',         'img/serdce-malina.jpg'],
  // ПП-десерты без сахара
  ['Трайфл Фисташка–малина',                 'img/trifle-pistachio-raspberry.jpg'],
  ['Трайфл Вишня–шоколад',                   'img/trifle-cherry-chocolate.jpg'],
  ['Трайфл Кофейный',                        'img/trifle-coffee.jpg'],
  ['Трайфл Шоколадно–ореховый',              'img/trifle-chocolate-nut.jpg'],
  ['Муссовый чизкейк Кофейно–шоколадный',    'img/cheesecake-coffee-chocolate.jpg'],
  ['Муссовый чизкейк Арахисовый',            'img/cheesecake-peanut.jpg'],
  ['Муссовый чизкейк Фисташковый',           'img/cheesecake-pistachio.jpg'],
  ['Муссовый чизкейк Манго–маракуйя',        'img/cheesecake-mango-passion.jpg'],
  ['Муссовый чизкейк Яблоко–брусника',       'img/cheesecake-apple-cowberry.jpg'],
  ['Муссовый чизкейк Лимонный',              'img/cheesecake-lemon.jpg'],
  ['Муссовый чизкейк Голубика–ежевика',      'img/cheesecake-blueberry-blackberry.jpg'],
  ['Муссовый чизкейк Груша–кокос',           'img/cheesecake-pear-coconut.jpg'],
  ['Муссовый чизкейк Пряный апельсин',       'img/cheesecake-spiced-orange.jpg'],
  ['Муссовый чизкейк Миндальный',            'img/cheesecake-almond.jpg'],
  ['Мусскейк «Малиновый» с гранатом',        'img/mousscake-raspberry-pomegranate.jpg'],
  ['Трюфельное ПП пирожное',                 'img/truffle_cake.jpg'],
  ['Медовик с малиной ПП пирожное',          'img/medovik-raspberry.jpg'],
  ['Медовик гречишный ПП пирожное',          'img/medovik-buckwheat.jpg'],
  ['Чизкейк «Сан-Себастьян»',                'img/cheesecake-san-sebastian.jpg'],
  // Веган
  ['Трайфл Персик–маракуйя',                 'img/trifle-peach-passion.jpg'],
  ['Кешьюкейк с красной смородиной',         'img/cashewcake-redcurrant.jpg'],
  ['Кешьюкейк с чёрной смородиной',          'img/cashewcake-blackcurrant.jpg'],
  // Вафли
  ['Вафля банан',                            'img/waffle-banana.jpg'],
  ['Вафля ваниль',                           'img/waffle-vanilla.jpg'],
  ['Вафля зефир-апельсин',                   'img/waffle-orange-marshmallow.jpg'],
  ['Вафля зефир-вишня',                      'img/waffle-cherry-marshmallow.jpg'],
  ['Вафля карамель арахис изюм',             'img/waffle-caramel-peanut-raisin.jpg'],
  ['Вафля карамель',                         'img/waffle-caramel.jpg'],
  ['Вафля кокос-пломбир',                    'img/waffle-coconut.jpg'],
  ['Вафля кофе с молоком',                   'img/waffle-coffee-milk.jpg'],
  ['Вафля лимон с шоколадной крошкой',       'img/waffle-lemon-chocolate.jpg'],
  ['Вафля птичье молоко в шоколадной глазури', 'img/waffle-birdsmilk-glaze.jpg'],
  ['Вафля птичье молоко',                    'img/waffle-birdsmilk.jpg'],
  ['Вафля суфле в белом шоколаде',           'img/waffle-souffle-white.jpg'],
  ['Вафля суфле в молочном шоколаде',        'img/waffle-souffle-milk.jpg'],
  ['Вафля шоколад-апельсин',                 'img/waffle-chocolate-orange.jpg'],
  // Сладости к кофе
  ['Ириска классическая',                    'img/toffee-classic.jpg'],
  ['Ириска с бланшированным миндалём',       'img/toffee-almond.jpg'],
  ['Ириска с грецким орехом',                'img/toffee-walnut.jpg'],
  ['Ириска с кешью',                         'img/toffee-cashew.jpg'],
  ['Ириска с розовой гималайской солью',     'img/toffee-himalayan-salt.jpg'],
  ['Ириска шоколадная',                      'img/toffee-chocolate.jpg'],
  // Сырники
  ['Сырники классические 3 шт.',             'img/syrniki-classic.jpg'],
  ['Сырники груша 3 шт.',                    'img/syrniki-pear.jpg'],
  ['Сырники яблоко корица 3 шт.',            'img/syrniki-apple-cinnamon.jpg'],
  ['Сырники лесная ягода 3 шт.',             'img/syrniki-wildberry.jpg'],
  ['Сырники чёрная смородина 3 шт.',         'img/syrniki-wildberry.jpg'],
  ['Сырники вишня 3 шт.',                    'img/syrniki-wildberry.jpg'],
  ['Оладьи классические',                    'img/syrniki-classic.jpg'],
  ['Оладьи груша',                           'img/syrniki-pear.jpg'],
  // Круассаны
  ['Круассан',                               'img/croissant-classic.jpg'],
  ['Круассан малина',                        'img/croissant-raspberry.jpg'],
  ['Круассан миндаль',                       'img/croissant-almond.jpg'],
  ['Круассан с белой сгущёнкой 90гр',        'img/croissant-condensed-white.jpg'],
  ['Круассан с варёной сгущёнкой 90гр',      'img/croissant-condensed-boiled.jpg'],
  ['Круассан карамель',                      'img/croissant-caramel.jpg'],
  ['Круассан буженина',                      'img/croissant-bujenina.jpg'],
  ['Круассан ветчина сыр',                   'img/croissant-ham-cheese.jpg'],
  ['Круассан говядина',                      'img/croissant-beef.jpg'],
  ['Круассан скрэмбл',                       'img/croissant-scrambled.jpg'],
  ['Круассан курица',                        'img/croissant-chicken.jpg'],
  ['Круассан индейка',                       'img/croissant-turkey.jpg'],
  ['Круассан лосось',                        'img/croissant-salmon.jpg'],
  // Сэндвичи
  ['Клаб сэндвич (половина)',                'img/sandwich-club-half.jpg'],
  ['Клаб сэндвич',                           'img/sandwich-club.jpg'],
  ['Сэндвич бекон-яйцо',                    'img/sandwich-bacon-egg.jpg'],
  ['Сэндвич буженина',                       'img/sandwich-bujenina.jpg'],
  ['Сэндвич с ветчиной и сыром',             'img/sandwich-ham-cheese.jpg'],
  ['Сэндвич с говядиной',                    'img/sandwich-beef.jpg'],
  ['Сэндвич индейка',                        'img/sandwich-turkey.jpg'],
  ['Сэндвич с лососем',                      'img/sandwich-salmon.jpg'],
  ['Сэндвич из чёрного хлеба с лососем',     'img/sandwich-salmon-black-bread.jpg'],
  ['Сэндвич из фокаччи с куриной котлетой',  'img/croissant-chicken.jpg'],
  ['Сэндвич из фокаччи с индейкой',          'img/sandwich-turkey.jpg'],
  // Салаты и боулы
  ['Салат Цезарь',                           'img/salad-caesar.jpg'],
  ['Салат с лососем',                        'img/salad-salmon.jpg'],
  ['Салат с тунцом',                         'img/salad-tuna.jpg'],
  ['Поке с лососем',                         'img/salad-salmon.jpg'],
];

function removeTapioka(tenantId) {
  db.prepare(
    `DELETE FROM modifier_options WHERE name = 'Тапиока'
       AND group_id IN (SELECT id FROM modifier_groups WHERE tenant_id = ? AND name = 'Добавки')`,
  ).run(tenantId);
}

function applyPackagingFee(tenantId) {
  const fee = Number(process.env.SEED_PACKAGING_FEE || 0);
  db.prepare('UPDATE tenants SET packaging_fee_rub = ? WHERE id = ?').run(fee, tenantId);
}

/**
 * Ключи кассы ЮKassa — применяем на каждом старте, как и роли персонала.
 * Если они есть, оплата идёт по ссылке в браузере (карта + СБП), а не через
 * платёжную шторку Telegram.
 */
function applyYooKassaFromEnv(tenantId) {
  // Имя бота нужно странице возврата из браузера — кнопка «Вернуться в Telegram».
  const botUser = String(process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
  if (botUser) db.prepare('UPDATE tenants SET bot_username = ? WHERE id = ?').run(botUser, tenantId);

  const shopId = String(process.env.YOOKASSA_SHOP_ID || '').trim();
  const secret = String(process.env.YOOKASSA_SECRET_KEY || '').trim();
  db.prepare('UPDATE tenants SET yk_shop_id = ?, yk_secret_key = ? WHERE id = ?')
    .run(shopId || null, secret || null, tenantId);
  // Касса настроена — включаем онлайн-оплату, даже если токена из BotFather нет.
  if (shopId && secret) {
    db.prepare("UPDATE tenants SET payment_mode = 'online' WHERE id = ?").run(tenantId);
  }
}

// Фото-заглушки, которые проставляются автоматически. Держим списком, чтобы
// сбрасывать их перед пересчётом: иначе ошибочно назначенная заглушка
// («Айс-латте» в кружке вместо стакана) навсегда останется в базе.
const PLACEHOLDERS = ['img/raf.jpg', 'img/cappuccino.jpg'];

function applyPhotoUpdates(tenantId) {
  // Сбрасываем прошлые заглушки — настоящие фото тут же вернёт PHOTO_MAP.
  db.prepare(
    `UPDATE products SET photo_url = NULL
      WHERE tenant_id = ? AND photo_url IN (${PLACEHOLDERS.map(() => '?').join(',')})`,
  ).run(tenantId, ...PLACEHOLDERS);

  const stmt = db.prepare('UPDATE products SET photo_url = ? WHERE tenant_id = ? AND name = ?');
  for (const [name, url] of PHOTO_MAP) stmt.run(url, tenantId, name);

  // Заглушки для позиций, у которых нет индивидуальной фотки.
  // Раф и латте подают в стакане — берём img/raf.jpg. LIKE в SQLite не
  // приводит кириллицу к одному регистру, поэтому перебираем оба варианта:
  // иначе «Айс-латте» и «Матча-латте» мимо шаблона '%Латте%' проходят.
  db.prepare(
    `UPDATE products SET photo_url = 'img/raf.jpg'
      WHERE tenant_id = ? AND (photo_url IS NULL OR photo_url = '')
        AND (name LIKE '%Раф%' OR name LIKE '%раф%'
          OR name LIKE '%Латте%' OR name LIKE '%латте%')`,
  ).run(tenantId);

  // Остальные напитки кофейных категорий — в кружке (img/cappuccino.jpg).
  db.prepare(
    `UPDATE products SET photo_url = 'img/cappuccino.jpg'
      WHERE tenant_id = ? AND (photo_url IS NULL OR photo_url = '')
        AND category_id IN (
          SELECT id FROM categories
          WHERE tenant_id = ?
            AND name IN ('Кофе', 'Авторский кофе', 'Холодный кофе', 'Спешлти')
        )`,
  ).run(tenantId, tenantId);
}

/**
 * Владелец и бариста из окружения — применяем при каждом старте, а не только
 * при создании кофейни. Иначе переменную, добавленную позже, никто не увидит,
 * и после пересоздания базы остаться без доступа к ленте проще простого.
 */
function applyStaffFromEnv(tenantId) {
  // В переменной можно перечислить несколько id через запятую — например,
  // двух владельцев: SEED_OWNER_TG_ID=111,222
  const ids = (value) => String(value || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));

  const roles = [
    [process.env.SEED_OWNER_TG_ID, 'owner', 'Владелец'],
    [process.env.SEED_BARISTA_TG_ID, 'barista', 'Бариста'],
  ];
  // Имя обновляем только у новых записей: у добавленных через админ-API оно
  // осмысленное, и затирать его безликим «Владелец» не надо.
  const stmt = db.prepare(
    `INSERT INTO staff (id, tenant_id, tg_user_id, role, name) VALUES (?,?,?,?,?)
     ON CONFLICT(tenant_id, tg_user_id) DO UPDATE SET role = excluded.role, active = 1`,
  );
  for (const [raw, role, name] of roles) {
    for (const tgId of ids(raw)) stmt.run(uid(), tenantId, tgId, role, name);
  }
  // Тех, кого убрали из переменной, здесь не отключаем: персонал можно
  // заводить и через админ-API, такие записи снести было бы неожиданно.
}

export function seedDemo() {
  const slug = 'lubov';
  const botToken = process.env.DEMO_BOT_TOKEN || '';
  // Токен платёжного провайдера (ЮKassa) из BotFather. Если задан — включаем
  // онлайн-оплату; если пусто — оплата остаётся на кассе.
  const providerToken = process.env.DEMO_PROVIDER_TOKEN || '';
  const existing = db.prepare('SELECT id FROM tenants WHERE slug = ?').get(slug);
  if (existing) {
    // Обновляем токен при каждом старте — актуально после Revoke в BotFather.
    if (botToken) db.prepare('UPDATE tenants SET bot_token = ? WHERE slug = ?').run(botToken, slug);
    // Провайдер: задан → онлайн-оплата, пусто → на кассе (можно выключить, убрав env).
    db.prepare('UPDATE tenants SET payment_provider_token = ?, payment_mode = ? WHERE slug = ?')
      .run(providerToken || null, providerToken ? 'online' : 'offline', slug);
    // Обновляем photo_url для всех продуктов у которых появилось фото.
    applyPhotoUpdates(existing.id);
    applyStaffFromEnv(existing.id);
    removeTapioka(existing.id);
    applyPackagingFee(existing.id);
    applyYooKassaFromEnv(existing.id);
    return existing.id;
  }

  const tenantId = uid();

  db.prepare(
    `INSERT INTO tenants (id, slug, name, bot_token, webhook_secret, payment_mode, payment_provider_token, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(tenantId, slug, 'Любовь-Марковь', botToken, crypto.randomBytes(16).toString('hex'),
    providerToken ? 'online' : 'offline', providerToken || null, now());

  applyStaffFromEnv(tenantId);

  // Категории
  const catIds = {};
  for (const [key, name, sort] of CATEGORIES) {
    const id = uid();
    db.prepare('INSERT INTO categories (id, tenant_id, name, sort) VALUES (?,?,?,?)').run(id, tenantId, name, sort);
    catIds[key] = id;
  }

  // === Общие группы модификаторов ===

  const milkGid = insertGroup(tenantId, 'Молоко', false, 0, 1, [
    ['Обычное молоко', 0, true],
    ['Безлактозное', 80, false],
    ['Кокосовое', 80, false],
    ['Миндальное', 80, false],
    ['Фундучное', 80, false],
    ['Банановое', 80, false],
    ['Фисташковое', 80, false],
    ['Сливки 100мл', 70, false],
  ]);

  const addonsGid = insertGroup(tenantId, 'Добавки', false, 0, 5, [
    ['Сироп', 60, false],
    ['Мята свежая', 50, false],
    ['Корица', 0, false],
    ['Сахар', 0, false],
    ['Лимон', 50, false],
    ['Шот эспрессо', 100, false],
  ]);

  const foodExtrasGid = insertGroup(tenantId, 'К еде', false, 0, 2, [
    ['Сметана порц. 40гр', 50, false],
    ['Варенье порц. 40гр', 50, false],
  ]);

  // === Группы объёмов (per-product-family) ===
  // Американо 200мл(база 220) / 300мл(+30=250)
  const volAmer = insertGroup(tenantId, 'Объём', true, 1, 1, [
    ['200 мл', 0, true],
    ['300 мл', 30, false],
  ]);
  // Капучино 200мл(база 250) / 300мл(+40=290) / 400мл(+110=360)
  const volCap = insertGroup(tenantId, 'Объём', true, 1, 1, [
    ['200 мл', 0, true],
    ['300 мл', 40, false],
    ['400 мл', 110, false],
  ]);
  // Латте 300мл(база 290) / 400мл(+60=350)
  const volLatte = insertGroup(tenantId, 'Объём', true, 1, 1, [
    ['300 мл', 0, true],
    ['400 мл', 60, false],
  ]);
  // Раф 300мл(база 340) / 400мл(+100=440)
  const volRaf = insertGroup(tenantId, 'Объём', true, 1, 1, [
    ['300 мл', 0, true],
    ['400 мл', 100, false],
  ]);
  // Флэт уайт 200мл(база 270) / 300мл(+50=320)
  const volFW = insertGroup(tenantId, 'Объём', true, 1, 1, [
    ['200 мл', 0, true],
    ['300 мл', 50, false],
  ]);
  // Какао / Матча-латте / Айс матча-латте: 300мл(база) / 400мл(+50)
  const volSm = insertGroup(tenantId, 'Объём', true, 1, 1, [
    ['300 мл', 0, true],
    ['400 мл', 50, false],
  ]);
  // Авторские латте (морковный, халва): 300мл(база 395) / 400мл(+70=465)
  const volLM = insertGroup(tenantId, 'Объём', true, 1, 1, [
    ['300 мл', 0, true],
    ['400 мл', 70, false],
  ]);
  // Авторские рафы (арахис/баунти/кедровый/грецкий): 300мл(база 395) / 400мл(+90=485)
  const volRP = insertGroup(tenantId, 'Объём', true, 1, 1, [
    ['300 мл', 0, true],
    ['400 мл', 90, false],
  ]);

  const MA = (volGid) => [volGid, milkGid, addonsGid];

  let s = 0;

  // === Кофе ===
  insertProduct(tenantId, catIds['кофе'], 'Американо', 220, s++, MA(volAmer),
    'Классический чёрный кофе на эспрессо и горячей воде. Насыщенный, бодрящий.');
  insertProduct(tenantId, catIds['кофе'], 'Капучино', 250, s++, MA(volCap),
    'Эспрессо с бархатистой молочной пеной. Сбалансированный и мягкий.');
  insertProduct(tenantId, catIds['кофе'], 'Латте', 290, s++, MA(volLatte),
    'Много молока, немного эспрессо — нежный и кремовый вкус.');
  insertProduct(tenantId, catIds['кофе'], 'Воронка V60', 310, s++, [milkGid, addonsGid],
    'Альтернативный фильтр-кофе ручной заварки. Раскрывает вкус зерна.');
  insertProduct(tenantId, catIds['кофе'], 'Раф', 340, s++, MA(volRaf),
    'Эспрессо, сливки и ваниль, взбитые вместе. Десертный и обволакивающий.');
  insertProduct(tenantId, catIds['кофе'], 'Флэт уайт', 270, s++, MA(volFW),
    'Двойной эспрессо с тонким слоем молока. Плотный кофейный вкус.');
  insertProduct(tenantId, catIds['кофе'], 'Флэт уайт хвойный 300мл', 380, s++, [milkGid, addonsGid],
    'Флэт уайт с хвойным сиропом — неожиданный лесной акцент.');
  insertProduct(tenantId, catIds['кофе'], 'Какао (без сахара)', 300, s++, MA(volSm),
    'Горячее какао на молоке без добавленного сахара.');
  insertProduct(tenantId, catIds['кофе'], 'Матча-латте', 350, s++, MA(volSm),
    'Японская матча с молоком. Выбор цвета: зелёная, голубая или розовая.');

  // === Авторский кофе ===
  insertProduct(tenantId, catIds['авторский кофе'], 'Латте морковный', 395, s++, MA(volLM),
    'Фирменный латте со вкусом морковного пирога и специй.');
  insertProduct(tenantId, catIds['авторский кофе'], 'Латте халва', 395, s++, MA(volLM),
    'Латте с нотами восточной халвы и подсолнечника.');
  insertProduct(tenantId, catIds['авторский кофе'], 'Раф арахис', 395, s++, MA(volRP),
    'Кремовый раф с насыщенным арахисовым вкусом.');
  insertProduct(tenantId, catIds['авторский кофе'], 'Раф баунти', 395, s++, MA(volRP),
    'Раф с кокосом и шоколадом — как любимый батончик.');
  insertProduct(tenantId, catIds['авторский кофе'], 'Раф кедровый', 395, s++, MA(volRP),
    'Раф со сливочным вкусом кедрового ореха.');
  insertProduct(tenantId, catIds['авторский кофе'], 'Раф грецкий', 395, s++, MA(volRP),
    'Раф с ароматом грецкого ореха.');

  // === Холодный кофе ===
  insertProduct(tenantId, catIds['холодный кофе'], 'Айс-капучино', 360, s++, [milkGid, addonsGid],
    'Капучино со льдом — освежающий и бодрящий.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Айс-латте', 350, s++, [milkGid, addonsGid],
    'Латте со льдом. Нежный молочный вкус в жару.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Клубничный айс-латте', 450, s++, [milkGid, addonsGid],
    'Айс-латте с клубничным пюре. Летний и ягодный.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Бамбл апельсиновый', 380, s++, [addonsGid],
    'Эспрессо на свежем апельсиновом соке со льдом.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Бамбл гранатовый', 380, s++, [addonsGid],
    'Эспрессо с гранатовым соком и льдом.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Бамбл апероль', 380, s++, [addonsGid],
    'Освежающий бамбл с апероль-акцентом (безалкогольный).');
  insertProduct(tenantId, catIds['холодный кофе'], 'Бамбл фреш', 490, s++, [addonsGid],
    'Бамбл на свежевыжатом соке. Двойная порция бодрости.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Эспрессо тоник 250мл', 320, s++, [addonsGid],
    'Эспрессо с тоником и льдом. Игристый и освежающий.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Матча тоник 250мл', 320, s++, [addonsGid],
    'Матча с тоником и льдом.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Айс матча-латте', 350, s++, MA(volSm),
    'Матча-латте со льдом. Выбор цвета: зелёная, голубая или розовая.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Банановый матча-латте', 450, s++, [milkGid, addonsGid],
    'Матча-латте с бананом. Мягкий и питательный.');
  insertProduct(tenantId, catIds['холодный кофе'], 'Мятный фраппе', 420, s++, [milkGid, addonsGid],
    'Взбитый холодный кофе со свежей мятой.');

  // === Спешлти ===
  insertProduct(tenantId, catIds['спешелти'], 'Раф Muscovado 300мл', 395, s++, [milkGid, addonsGid],
    'Раф на тростниковом сахаре мусковадо с карамельными нотами.');
  insertProduct(tenantId, catIds['спешелти'], 'Коктейль «Беллини» шампанское б/а персиковое пюре', 450, s++, [],
    'Безалкогольный игристый коктейль с персиковым пюре.');
  insertProduct(tenantId, catIds['спешелти'], 'Айс-фьюри с урбечем', 450, s++, [],
    'Холодный авторский напиток с урбечем.');

  // === Не кофе ===
  insertProduct(tenantId, catIds['не кофе'], 'Горячий шоколад 300мл', 360, s++, [addonsGid],
    'Густой горячий шоколад на молоке.');
  insertProduct(tenantId, catIds['не кофе'], 'Бабл-ти кокосовое молоко 0,5л', 380, s++, [addonsGid],
    'Чай на кокосовом молоке с тапиокой и сиропом на выбор.');

  // === Чай ===
  insertProduct(tenantId, catIds['чай'], 'Чай чёрный 400мл', 190, s++, []);
  insertProduct(tenantId, catIds['чай'], 'Чай улун 400мл', 190, s++, []);
  insertProduct(tenantId, catIds['чай'], 'Чай зелёный сакура 400мл', 190, s++, []);
  insertProduct(tenantId, catIds['чай'], 'Чай анчан 400мл', 190, s++, []);
  insertProduct(tenantId, catIds['чай'], 'Чай эрлгрей 400мл', 190, s++, []);

  // === Напитки ===
  insertProduct(tenantId, catIds['напитки'], 'Вода б/г 0,5л', 200, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Кола 0,33л', 230, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Сок апельсиновый 0,33л', 190, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Лимонад Мохито 0,5л', 350, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Лимонад Мохито клубничный 0,5л', 350, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Лимонад Черника-Лаванда 0,5л', 350, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Лимонад Персик-Орхидея 0,5л', 350, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Молочный коктейль ванильный 450мл', 380, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Молочный коктейль шоколадный 450мл', 380, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Молочный коктейль клубничный 450мл', 380, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Фреш апельсиновый 400мл', 450, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Смузи манго 0,5л', 450, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Смузи черника-банан 0,5л', 450, s++, []);
  insertProduct(tenantId, catIds['напитки'], 'Смузи клубника-банан 0,5л', 450, s++, []);

  // === Еда ===
  // Блины (3 шт.) — сметана включена в цену, но к ним доступны допы
  insertProduct(tenantId, catIds['еда'], 'Блины с курицей 3 шт.', 350, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Блины Жульен 3 шт.', 350, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Блины с малиной 3 шт.', 350, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Блины шоколад с бананом 3 шт.', 350, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Блины с варёной сгущёнкой 2 шт.', 240, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Блины яблоко с корицей 2 шт.', 240, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Блины творог со сгущёнкой 2 шт.', 240, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Блины ветчина и сыр 2 шт.', 190, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Блины курица с моцареллой 2 шт.', 310, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Блины лосось с творожным сыром 2 шт.', 320, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Блины шоколадные с творожным сыром и вишней 2 шт.', 240, s++, []);
  // Оладьи
  insertProduct(tenantId, catIds['еда'], 'Оладьи классические', 280, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Оладьи груша', 280, s++, [foodExtrasGid]);
  // Сырники
  insertProduct(tenantId, catIds['еда'], 'Сырники классические 3 шт.', 340, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Сырники груша 3 шт.', 340, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Сырники яблоко корица 3 шт.', 340, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Сырники лесная ягода 3 шт.', 340, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Сырники чёрная смородина 3 шт.', 340, s++, [foodExtrasGid]);
  insertProduct(tenantId, catIds['еда'], 'Сырники вишня 3 шт.', 340, s++, [foodExtrasGid]);
  // Боулы и поке
  insertProduct(tenantId, catIds['еда'], 'Боул с курицей', 420, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Поке с лососем', 440, s++, []);
  // Салаты
  insertProduct(tenantId, catIds['еда'], 'Салат Цезарь', 320, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Салат с лососем', 390, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Салат с тунцом', 390, s++, []);
  // Круассаны
  insertProduct(tenantId, catIds['еда'], 'Круассан', 200, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан малина', 250, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан миндаль', 250, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан с белой сгущёнкой 90гр', 250, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан с варёной сгущёнкой 90гр', 250, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан карамель', 250, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан буженина', 350, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан ветчина сыр', 350, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан говядина', 360, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан скрэмбл', 360, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан курица', 360, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан индейка', 410, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Круассан лосось', 410, s++, []);
  // Сэндвичи
  insertProduct(tenantId, catIds['еда'], 'Клаб сэндвич (половина)', 270, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Клаб сэндвич', 420, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Сэндвич бекон-яйцо', 350, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Сэндвич буженина', 350, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Сэндвич с ветчиной и сыром', 350, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Сэндвич с говядиной', 350, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Сэндвич индейка', 420, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Сэндвич с лососем', 420, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Сэндвич из чёрного хлеба с лососем', 420, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Сэндвич из фокаччи с куриной котлетой', 450, s++, []);
  insertProduct(tenantId, catIds['еда'], 'Сэндвич из фокаччи с индейкой', 450, s++, []);

  // === Десерты ===
  insertProduct(tenantId, catIds['десерты'], 'Ватрушка королевская', 260, s++, []);
  insertProduct(tenantId, catIds['десерты'], 'Капкейк', 330, s++, [], '', 'img/kapkeik.jpg');
  insertProduct(tenantId, catIds['десерты'], 'Наполеон пирожное', 310, s++, [], '', 'img/napoleon.jpg');
  insertProduct(tenantId, catIds['десерты'], 'Пирожное морковное', 270, s++, []);
  insertProduct(tenantId, catIds['десерты'], 'Пирожное сердце малина', 300, s++, [], '', 'img/serdce-malina.jpg');
  insertProduct(tenantId, catIds['десерты'], 'Картофан шоколадный', 260, s++, []);
  insertProduct(tenantId, catIds['десерты'], 'Картофан фисташковый', 260, s++, []);
  insertProduct(tenantId, catIds['десерты'], 'Картофан арахисовый', 260, s++, []);
  insertProduct(tenantId, catIds['десерты'], 'Картофан ванильный', 260, s++, []);
  insertProduct(tenantId, catIds['десерты'], 'Картофан красный бархат', 260, s++, []);
  insertProduct(tenantId, catIds['десерты'], 'Картофан морковка', 260, s++, []);

  // === Десерты без сахара ===
  const nsd = catIds['десерты без сахара'];
  insertProduct(tenantId, nsd, 'Трайфл Фисташка–малина', 270, s++, []);
  insertProduct(tenantId, nsd, 'Трайфл Вишня–шоколад', 270, s++, []);
  insertProduct(tenantId, nsd, 'Трайфл Кофейный', 270, s++, []);
  insertProduct(tenantId, nsd, 'Трайфл Шоколадно–ореховый', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Кофейно–шоколадный', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Арахисовый', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Фисташковый', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Манго–маракуйя', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Яблоко–брусника', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Лимонный', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Голубика–ежевика', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Груша–кокос', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Пряный апельсин', 299, s++, []);
  insertProduct(tenantId, nsd, 'Муссовый чизкейк Миндальный', 299, s++, []);
  insertProduct(tenantId, nsd, 'Мусскейк «Малиновый» с гранатом', 299, s++, []);
  insertProduct(tenantId, nsd, 'Трюфельное ПП пирожное', 299, s++, []);
  insertProduct(tenantId, nsd, 'Медовик с малиной ПП пирожное', 299, s++, []);
  insertProduct(tenantId, nsd, 'Медовик гречишный ПП пирожное', 299, s++, []);
  insertProduct(tenantId, nsd, 'Чизкейк «Сан-Себастьян»', 299, s++, []);

  // === Десерты веган ===
  const veg = catIds['десерты веган'];
  insertProduct(tenantId, veg, 'Трайфл Персик–маракуйя', 270, s++, []);
  insertProduct(tenantId, veg, 'Кешьюкейк с красной смородиной', 299, s++, []);
  insertProduct(tenantId, veg, 'Кешьюкейк с чёрной смородиной', 299, s++, []);

  // === Вафли ===
  const vaf = catIds['вафли'];
  insertProduct(tenantId, vaf, 'Вафля банан', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля ваниль', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля зефир-апельсин', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля зефир-вишня', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля карамель арахис изюм', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля карамель', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля кокос-пломбир', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля кофе с молоком', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля лимон с шоколадной крошкой', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля птичье молоко в шоколадной глазури', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля птичье молоко', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля суфле в белом шоколаде', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля суфле в молочном шоколаде', 180, s++, []);
  insertProduct(tenantId, vaf, 'Вафля шоколад-апельсин', 180, s++, []);

  // === Сладкие мелочи ===
  const sm = catIds['сладкие мелочи'];
  insertProduct(tenantId, sm, 'Ириска классическая', 100, s++, []);
  insertProduct(tenantId, sm, 'Ириска с бланшированным миндалём', 100, s++, []);
  insertProduct(tenantId, sm, 'Ириска с грецким орехом', 100, s++, []);
  insertProduct(tenantId, sm, 'Ириска с кешью', 100, s++, []);
  insertProduct(tenantId, sm, 'Ириска с розовой гималайской солью', 100, s++, []);
  insertProduct(tenantId, sm, 'Ириска шоколадная', 100, s++, []);
  insertProduct(tenantId, sm, 'Орешки со сгущёнкой 3 шт.', 150, s++, []);
  insertProduct(tenantId, sm, 'Трубочка со сгущёнкой', 150, s++, []);
  insertProduct(tenantId, sm, 'Печенье кукис шоколадное с фундуком', 180, s++, []);
  insertProduct(tenantId, sm, 'Печенье кукис вишня с белым шоколадом', 180, s++, []);
  insertProduct(tenantId, sm, 'Печенье кукис фисташка с белым шоколадом', 180, s++, []);
  insertProduct(tenantId, sm, 'Печенье кукис черника с белым шоколадом', 180, s++, []);
  insertProduct(tenantId, sm, 'Печенье кукис фисташка-малина', 180, s++, []);
  insertProduct(tenantId, sm, 'Печенье кукис шоколадное с маршмеллоу', 180, s++, []);
  insertProduct(tenantId, sm, 'Печенье кукис с грецким орехом', 180, s++, []);

  // Фото — единым списком, чтобы новая база и существующая получали одно и то же.
  applyPhotoUpdates(tenantId);
  applyPackagingFee(tenantId);
  applyYooKassaFromEnv(tenantId);
  return tenantId;
}
