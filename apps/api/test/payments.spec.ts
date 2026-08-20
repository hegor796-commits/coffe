import { decryptSecret, encryptSecret, isPlaceholderKey, maskSecret } from '../src/payments/secrets.util';
import { ipAllowed } from '../src/payments/ip-allowlist';
import { kopecksToValue } from '../src/payments/yookassa.client';

describe('шифрование секретов эквайринга', () => {
  const hexKey = 'a'.repeat(64);

  it('расшифровывает то, что зашифровало', () => {
    const secret = 'test_kL9xQwErTy1234567890';
    expect(decryptSecret(encryptSecret(secret, hexKey), hexKey)).toBe(secret);
  });

  it('каждый раз даёт разный шифртекст (случайный iv)', () => {
    expect(encryptSecret('secret', hexKey)).not.toBe(encryptSecret('secret', hexKey));
  });

  it('работает и с ключом произвольной длины (нормализуется через sha256)', () => {
    const key = 'просто длинная фраза вместо hex';
    expect(decryptSecret(encryptSecret('s3cr3t', key), key)).toBe('s3cr3t');
  });

  it('не расшифровывает чужим ключом', () => {
    const cipher = encryptSecret('s3cr3t', hexKey);
    expect(() => decryptSecret(cipher, 'b'.repeat(64))).toThrow();
  });

  it('распознаёт ключ-заглушку из configuration.ts', () => {
    expect(isPlaceholderKey('0'.repeat(32))).toBe(true);
    expect(isPlaceholderKey(hexKey)).toBe(false);
  });

  it('маскирует секрет для логов', () => {
    expect(maskSecret('live_ABCDEFGHIJKLMNOP')).toBe('live_…MNOP');
    expect(maskSecret('short')).toBe('***');
  });
});

describe('проверка адреса отправителя уведомлений', () => {
  const allowed = ['185.71.76.0/27', '77.75.156.11', '2a02:5180::/32'];

  it('пропускает адрес из разрешённой подсети', () => {
    expect(ipAllowed('185.71.76.5', allowed)).toBe(true);
  });

  it('пропускает точное совпадение', () => {
    expect(ipAllowed('77.75.156.11', allowed)).toBe(true);
  });

  it('отбрасывает посторонний адрес', () => {
    expect(ipAllowed('8.8.8.8', allowed)).toBe(false);
    expect(ipAllowed('185.71.76.99', allowed)).toBe(false);
  });

  it('понимает ipv6 и ipv4-mapped', () => {
    expect(ipAllowed('2a02:5180::1', allowed)).toBe(true);
    expect(ipAllowed('::ffff:185.71.76.5', allowed)).toBe(true);
  });

  it('пустой список = проверка выключена', () => {
    expect(ipAllowed('8.8.8.8', [])).toBe(true);
  });
});

describe('перевод суммы в формат API', () => {
  it('копейки превращаются в рубли с двумя знаками', () => {
    expect(kopecksToValue(25000)).toBe('250.00');
    expect(kopecksToValue(1)).toBe('0.01');
    expect(kopecksToValue(12345)).toBe('123.45');
  });
});
