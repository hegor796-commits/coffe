import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Шифрование секретов эквайринга (AES-256-GCM).
 *
 * Формат хранения — base64(iv):base64(tag):base64(ciphertext), как описано
 * в комментарии к `PaymentCredential.secretCipher` в schema.prisma.
 *
 * Мастер-ключ берётся из SECRETS_ENCRYPTION_KEY. Принимаем и 64 hex-символа
 * (ровно 32 байта), и произвольную строку — во втором случае нормализуем
 * через sha256, чтобы длина ключа всегда была корректной.
 */
export function deriveKey(raw: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return createHash('sha256').update(raw, 'utf8').digest();
}

/** Ключ-заглушка из configuration.ts: на проде так работать нельзя. */
export function isPlaceholderKey(raw: string): boolean {
  return raw === '0'.repeat(32) || raw.trim() === '';
}

export function encryptSecret(plain: string, masterKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(masterKey), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

export function decryptSecret(stored: string, masterKey: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Повреждённый secretCipher: ожидается iv:tag:ciphertext');
  }
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(masterKey), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** Маска для логов и диагностики: секрет никогда не показываем целиком. */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) return '***';
  return `${secret.slice(0, 5)}…${secret.slice(-4)}`;
}
