// Смоук-тест бэкенда: поднимает реальный сервер на отдельном порту с чистой
// БД и проверяет ключевые сценарии end-to-end (без моков) — авторизация по
// Telegram-подписи, серверный расчёт цены, права ролей, машина состояний
// заказа, стоп-лист. Запуск: `npm test` (node --test).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3991;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = '123456:TEST-TOKEN-ABC';
const SLUG = 'lubov';

let dataDir;
let child;

function initData(user) {
  const p = new URLSearchParams();
  p.set('auth_date', String(Math.floor(Date.now() / 1000)));
  p.set('user', JSON.stringify(user));
  const pairs = [...p].map(([k, v]) => `${k}=${v}`).sort();
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const hash = crypto.createHmac('sha256', secret).update(pairs.join('\n')).digest('hex');
  p.set('hash', hash);
  return p.toString();
}
const CLIENT = initData({ id: 2002, first_name: 'Аня' });
const OWNER = initData({ id: 1001, first_name: 'Босс' });
const H = (idata) => ({ 'X-Tenant': SLUG, 'X-Init-Data': idata, 'Content-Type': 'application/json' });
async function j(res) { return { status: res.status, body: await res.json().catch(() => null) }; }

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'lm-test-'));
  child = spawn(process.execPath, [join(__dirname, '..', 'src', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, DEMO_BOT_TOKEN: TOKEN, SEED_OWNER_TG_ID: '1001', AUTO_SET_WEBHOOKS: 'false' },
    stdio: 'pipe',
  });
  // Ждём готовности сервера.
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in time')), 8000);
    child.stdout.on('data', (d) => { if (d.toString().includes('listening')) { clearTimeout(timer); resolve(); } });
    child.stderr.on('data', () => {});
  });
});

after(() => {
  child.kill();
  rmSync(dataDir, { recursive: true, force: true });
});

test('без подписи — 401', async () => {
  const res = await fetch(`${BASE}/api/bootstrap`, { headers: { 'X-Tenant': SLUG } });
  assert.equal(res.status, 401);
});

test('bootstrap отдаёт меню и роль client', async () => {
  const { status, body } = await j(await fetch(`${BASE}/api/bootstrap`, { headers: H(CLIENT) }));
  assert.equal(status, 200);
  assert.equal(body.role, 'client');
  assert.ok(body.menu.length > 50, `ожидали > 50 позиций, получили ${body.menu.length}`);
});

test('серверный расчёт цены — капучино с кокосовым молоком', async () => {
  const menu = (await j(await fetch(`${BASE}/api/bootstrap`, { headers: H(CLIENT) }))).body.menu;
  const cap = menu.find((p) => p.name === 'Капучино');
  assert.ok(cap, 'Капучино должен быть в меню');
  assert.ok(cap.groups.length > 0, 'у Капучино должны быть группы модификаторов');

  const milkGroup = cap.groups.find((g) => g.name === 'Молоко');
  assert.ok(milkGroup, 'должна быть группа Молоко');
  const coconut = milkGroup.options.find((o) => o.name === 'Кокосовое');
  assert.ok(coconut, 'должна быть опция Кокосовое');

  // Капучино база 250 + кокосовое молоко +80 = 330
  const { status, body } = await j(await fetch(`${BASE}/api/orders`, {
    method: 'POST', headers: H(CLIENT),
    body: JSON.stringify({ lines: [{ productId: cap.id, optionIds: [coconut.id], qty: 1 }] }),
  }));
  assert.equal(status, 201);
  assert.equal(body.order.total, 330);
});

test('отклоняет несуществующую опцию (защита от подмены цены)', async () => {
  const menu = (await j(await fetch(`${BASE}/api/bootstrap`, { headers: H(CLIENT) }))).body.menu;
  const cap = menu.find((p) => p.name === 'Капучино');
  const res = await fetch(`${BASE}/api/orders`, {
    method: 'POST', headers: H(CLIENT),
    body: JSON.stringify({ lines: [{ productId: cap.id, optionIds: ['FAKE_ID'], qty: 1 }] }),
  });
  assert.equal(res.status, 400);
});

test('доставка без адреса отклоняется', async () => {
  const menu = (await j(await fetch(`${BASE}/api/bootstrap`, { headers: H(CLIENT) }))).body.menu;
  const amer = menu.find((p) => p.name === 'Американо');
  const { status, body } = await j(await fetch(`${BASE}/api/orders`, {
    method: 'POST', headers: H(CLIENT),
    body: JSON.stringify({ fulfillment: 'delivery', delivery: {}, lines: [{ productId: amer.id, qty: 1 }] }),
  }));
  assert.equal(status, 400);
  assert.equal(body.error, 'need_address');
});

test('клиент не видит ленту бариста (403)', async () => {
  const res = await fetch(`${BASE}/api/staff/orders`, { headers: H(CLIENT) });
  assert.equal(res.status, 403);
});

test('полный жизненный цикл заказа владельцем: created → completed', async () => {
  const menu = (await j(await fetch(`${BASE}/api/bootstrap`, { headers: H(CLIENT) }))).body.menu;
  const amer = menu.find((p) => p.name === 'Американо');
  const created = (await j(await fetch(`${BASE}/api/orders`, {
    method: 'POST', headers: H(CLIENT), body: JSON.stringify({ lines: [{ productId: amer.id, qty: 1 }] }),
  }))).body.order;

  const feed = (await j(await fetch(`${BASE}/api/staff/orders`, { headers: H(OWNER) }))).body;
  assert.ok(feed.active.some((o) => o.id === created.id));

  for (const event of ['accept', 'start_preparing', 'mark_ready', 'complete']) {
    const { status, body } = await j(await fetch(`${BASE}/api/staff/orders/${created.id}/event`, {
      method: 'POST', headers: H(OWNER), body: JSON.stringify({ event }),
    }));
    assert.equal(status, 200, `переход ${event} должен пройти`);
    assert.notEqual(body.order.status, created.status);
  }

  // Терминальный статус — новые переходы запрещены.
  const res = await fetch(`${BASE}/api/staff/orders/${created.id}/event`, {
    method: 'POST', headers: H(OWNER), body: JSON.stringify({ event: 'accept' }),
  });
  assert.equal(res.status, 409);
});

test('стоп-лист скрывает товар из меню клиента', async () => {
  const menu = (await j(await fetch(`${BASE}/api/bootstrap`, { headers: H(CLIENT) }))).body.menu;
  const target = menu.find((p) => p.name === 'Латте');
  assert.ok(target, 'Латте должен быть в меню');
  await fetch(`${BASE}/api/staff/stop`, {
    method: 'POST', headers: H(OWNER), body: JSON.stringify({ productId: target.id, available: false }),
  });
  const after2 = (await j(await fetch(`${BASE}/api/bootstrap`, { headers: H(CLIENT) }))).body.menu;
  assert.equal(after2.find((p) => p.id === target.id).available, false);
});

test('сводка владельца отдаёт агрегаты за день', async () => {
  const { status, body } = await j(await fetch(`${BASE}/api/staff/summary`, { headers: H(OWNER) }));
  assert.equal(status, 200);
  assert.ok(body.revenue > 0);
  assert.ok(Array.isArray(body.hours) && body.hours.length === 24);
});
