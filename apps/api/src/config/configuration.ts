/**
 * Официальные подсети, с которых ЮKassa шлёт HTTP-уведомления.
 * Переопределяется переменной YOOKASSA_WEBHOOK_IPS (пустая строка = без проверки).
 */
const DEFAULT_YOOKASSA_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.128/25',
  '2a02:5180::/32',
].join(',');

export interface AppConfig {
  nodeEnv: string;
  port: number;
  publicAppUrl: string;
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    secret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  telegram: {
    botToken: string;
    webhookUrl: string;
    webhookSecret: string;
  };
  secretsEncryptionKey: string;
  yookassa: {
    /** Фолбэк-креды одного магазина, если в БД нет payment_credential. */
    shopId: string;
    secretKey: string;
    /** Куда ЮKassa вернёт клиента после оплаты (https, обычно ссылка на Mini App). */
    returnUrl: string;
    /** Формировать чек 54-ФЗ на стороне ЮKassa (облачная касса). */
    receiptEnabled: boolean;
    /** Код ставки НДС для позиций чека (1 — без НДС, УСН). */
    vatCode: number;
    /** Разрешённые адреса вебхуков; пусто = проверка по IP выключена. */
    webhookAllowedIps: string[];
  };
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    publicUrl: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  publicAppUrl: process.env.PUBLIC_APP_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL ?? '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? 'dev-webhook-secret',
  },
  secretsEncryptionKey: process.env.SECRETS_ENCRYPTION_KEY ?? '0'.repeat(32),
  yookassa: {
    shopId: process.env.YOOKASSA_SHOP_ID ?? '',
    secretKey: process.env.YOOKASSA_SECRET_KEY ?? '',
    returnUrl: process.env.YOOKASSA_RETURN_URL ?? '',
    receiptEnabled: process.env.YOOKASSA_RECEIPT_ENABLED === 'true',
    vatCode: parseInt(process.env.YOOKASSA_VAT_CODE ?? '1', 10),
    webhookAllowedIps: (process.env.YOOKASSA_WEBHOOK_IPS ?? DEFAULT_YOOKASSA_IPS)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'coffee-media',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    publicUrl: process.env.S3_PUBLIC_URL ?? 'http://localhost:9000/coffee-media',
  },
});
