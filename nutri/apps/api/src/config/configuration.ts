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
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'coffee-media',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    publicUrl: process.env.S3_PUBLIC_URL ?? 'http://localhost:9000/coffee-media',
  },
});
