import { createHmac } from 'node:crypto';

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface ParsedInitData {
  user: TelegramUser;
  authDate: number;
  startParam?: string;
  raw: string;
}

/**
 * Проверяет подпись Telegram Mini App initData по алгоритму из документации:
 *   secret_key = HMAC_SHA256(bot_token, "WebAppData")
 *   hash       = HMAC_SHA256(data_check_string, secret_key)
 * data_check_string — пары key=value (кроме hash), отсортированные, через \n.
 *
 * @throws Error если подпись неверна, данные протухли или пользователь отсутствует.
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 3600,
): ParsedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    throw new Error('initData: отсутствует hash');
  }
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    throw new Error('initData: неверная подпись');
  }

  const authDate = parseInt(params.get('auth_date') ?? '0', 10);
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || ageSeconds > maxAgeSeconds) {
    throw new Error('initData: данные устарели');
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    throw new Error('initData: отсутствует user');
  }
  const user = JSON.parse(userRaw) as TelegramUser;
  if (!user?.id) {
    throw new Error('initData: некорректный user');
  }

  return {
    user,
    authDate,
    startParam: params.get('start_param') ?? undefined,
    raw: initData,
  };
}
