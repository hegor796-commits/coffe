// Прямая интеграция с ЮKassa REST API v3.
//
// Зачем вместо Telegram Payments: платёжная шторка Telegram показывает только
// форму карты и на Android разъезжает под клавиатурой. ЮKassa же отдаёт ссылку
// на свою страницу оплаты — там клиент выбирает способ (карта, СБП), а по СБП
// попадает в приложение своего банка. Ссылку открываем во внешнем браузере.
//
// Документация: https://yookassa.ru/developers/api

const API = 'https://api.yookassa.ru/v3';

function authHeader(shopId, secretKey) {
  return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
}

/** Настроена ли у кофейни касса ЮKassa (shopId + секретный ключ). */
export function ykConfigured(tenant) {
  return !!(tenant && tenant.yk_shop_id && tenant.yk_secret_key);
}

async function ykFetch(tenant, path, { method = 'GET', body, idempotenceKey } = {}) {
  const headers = {
    Authorization: authHeader(tenant.yk_shop_id, tenant.yk_secret_key),
    'Content-Type': 'application/json',
  };
  // POST в ЮKassa обязан нести ключ идемпотентности: повтор с тем же ключом
  // возвращает уже созданный платёж, а не заводит второй.
  if (idempotenceKey) headers['Idempotence-Key'] = idempotenceKey;

  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.description || data.code)) || `HTTP ${res.status}`;
    return { ok: false, error: msg, status: res.status, data };
  }
  return { ok: true, data };
}

/**
 * Создаёт платёж и возвращает ссылку на страницу оплаты ЮKassa.
 * amountRub — целые рубли, receipt — чек 54-ФЗ (или null, если касса не облачная).
 */
export async function createPayment(tenant, { orderId, amountRub, description, returnUrl, receipt }) {
  const body = {
    amount: { value: Number(amountRub).toFixed(2), currency: 'RUB' },
    // Одностадийный платёж: списываем сразу, без отдельного подтверждения.
    capture: true,
    // redirect без payment_method_data — ЮKassa сама покажет выбор способа
    // оплаты, включая СБП с выбором банка.
    confirmation: { type: 'redirect', return_url: returnUrl },
    description: String(description || 'Заказ').slice(0, 128),
    metadata: { orderId, tenantId: tenant.id },
  };
  if (receipt) body.receipt = receipt;

  const r = await ykFetch(tenant, '/payments', {
    method: 'POST',
    body,
    idempotenceKey: `order-${orderId}`,
  });
  if (!r.ok) return r;

  const url = r.data && r.data.confirmation && r.data.confirmation.confirmation_url;
  if (!url) return { ok: false, error: 'no_confirmation_url', data: r.data };
  return { ok: true, paymentId: r.data.id, paymentUrl: url, status: r.data.status };
}

/** Текущее состояние платежа — источник правды при обработке вебхука. */
export async function getPayment(tenant, paymentId) {
  const r = await ykFetch(tenant, `/payments/${encodeURIComponent(paymentId)}`);
  if (!r.ok) return r;
  return { ok: true, status: r.data.status, paid: !!r.data.paid, data: r.data };
}
