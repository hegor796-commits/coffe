import { createHmac } from 'node:crypto';
import { validateInitData } from '../src/auth/telegram-initdata';

/** Собирает валидный initData с корректной подписью для тестового токена. */
function buildInitData(botToken: string, overrides: Record<string, string> = {}): string {
  const params: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: 42, first_name: 'Тест' }),
    ...overrides,
  };
  const dataCheckString = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const usp = new URLSearchParams(params);
  usp.set('hash', hash);
  return usp.toString();
}

describe('Валидация Telegram initData', () => {
  const token = '123456:TEST_TOKEN';

  it('принимает корректную подпись и парсит пользователя', () => {
    const parsed = validateInitData(buildInitData(token), token);
    expect(parsed.user.id).toBe(42);
  });

  it('отклоняет подделанную подпись', () => {
    const tampered = buildInitData(token).replace(/hash=[a-f0-9]+/, 'hash=deadbeef');
    expect(() => validateInitData(tampered, token)).toThrow(/подпись/);
  });

  it('отклоняет чужой токен', () => {
    const initData = buildInitData(token);
    expect(() => validateInitData(initData, 'другой:токен')).toThrow(/подпись/);
  });

  it('отклоняет протухшие данные', () => {
    const old = String(Math.floor(Date.now() / 1000) - 7200);
    const initData = buildInitData(token, { auth_date: old });
    expect(() => validateInitData(initData, token)).toThrow(/устарели/);
  });
});
