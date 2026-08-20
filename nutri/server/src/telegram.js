// Работа с Telegram: проверка подписи initData и вызовы Bot API.
import crypto from 'node:crypto';

/**
 * Проверяет подпись Telegram WebApp initData токеном конкретного бота (тенанта).
 * Возвращает { ok, user, authDate } — user это разобранный tgWebAppData.user.
 * Алгоритм: secret = HMAC_SHA256(key="WebAppData", msg=bot_token);
 *           hash   = HMAC_SHA256(key=secret, msg=data_check_string).
 */
export function validateInitData(botToken, initData, maxAgeSec) {
  if (!initData || typeof initData !== 'string') return { ok: false, reason: 'no_init_data' };
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'no_hash' };

  const pairs = [];
  for (const [k, v] of params) {
    if (k === 'hash') continue;
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  // Постоянное по времени сравнение.
  const a = Buffer.from(calc, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'bad_hash' };

  const authDate = Number(params.get('auth_date') || 0);
  if (maxAgeSec && authDate && Date.now() / 1000 - authDate > maxAgeSec) {
    return { ok: false, reason: 'expired' };
  }

  let user = null;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { /* ignore */ }
  if (!user || !user.id) return { ok: false, reason: 'no_user' };

  return { ok: true, user, authDate };
}

async function tgApi(botToken, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const json = await res.json().catch(() => ({}));
  return json;
}

export async function getMe(botToken) {
  return tgApi(botToken, 'getMe', {});
}

export async function setWebhook(botToken, url, secretToken) {
  return tgApi(botToken, 'setWebhook', {
    url,
    secret_token: secretToken,
    drop_pending_updates: true,
    // pre_checkout_query обязателен для оплаты; successful_payment приходит как message.
    allowed_updates: ['message', 'pre_checkout_query'],
  });
}

/**
 * Создаёт ссылку-счёт (Telegram Payments). Сумма — в минимальных единицах
 * валюты (для RUB — копейки). prices: [{ label, amount }].
 */
export async function createInvoiceLink(botToken, { title, description, payload, providerToken, currency, prices }) {
  return tgApi(botToken, 'createInvoiceLink', {
    title, description, payload,
    provider_token: providerToken,
    currency: currency || 'RUB',
    prices,
  });
}

/** Подтверждение перед списанием. Ответить нужно в течение 10 секунд. */
export async function answerPreCheckoutQuery(botToken, id, ok, errorMessage) {
  return tgApi(botToken, 'answerPreCheckoutQuery', {
    pre_checkout_query_id: id,
    ok: !!ok,
    error_message: ok ? undefined : (errorMessage || 'Не удалось оформить оплату'),
  });
}

/** Отправка сообщения; не роняет вызывающий код при ошибке доставки. */
export async function sendMessage(botToken, chatId, text, replyMarkup) {
  try {
    return await tgApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  } catch (e) {
    return { ok: false, description: String(e && e.message) };
  }
}

export function webAppButton(text, url) {
  return { inline_keyboard: [[{ text, web_app: { url } }]] };
}
