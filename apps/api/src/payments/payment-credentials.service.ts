import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret, isPlaceholderKey, maskSecret } from './secrets.util';
import { YooKassaClient, type YooKassaCreds } from './yookassa.client';

const PROVIDER = 'yookassa';

/**
 * Ключи эквайринга тенанта.
 *
 * Источник истины — таблица payment_credential (секрет зашифрован
 * SECRETS_ENCRYPTION_KEY). Если записи нет, используем переменные окружения
 * YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY — это рабочий путь для установки
 * с одной кофейней, где заводить ключи через API избыточно.
 */
@Injectable()
export class PaymentCredentialsService {
  private readonly logger = new Logger('PaymentCredentials');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private masterKey(): string {
    return this.config.get('secretsEncryptionKey', { infer: true });
  }

  /** Ключи тенанта: сперва БД, затем окружение. null — эквайринг не настроен. */
  async resolve(tenantId: string): Promise<YooKassaCreds | null> {
    const row = await this.prisma.paymentCredential.findUnique({
      where: { tenantId_provider: { tenantId, provider: PROVIDER } },
    });
    if (row) {
      try {
        return { shopId: row.shopId, secretKey: decryptSecret(row.secretCipher, this.masterKey()) };
      } catch (e) {
        // Чаще всего — сменился SECRETS_ENCRYPTION_KEY: старый шифртекст уже
        // не расшифровать, ключи надо записать заново.
        this.logger.error(
          `Не удалось расшифровать ключ ЮKassa тенанта ${tenantId}: ${(e as Error).message}. ` +
            'Проверьте SECRETS_ENCRYPTION_KEY и перезапишите ключи.',
        );
        return null;
      }
    }

    const fallback = this.config.get('yookassa', { infer: true });
    if (fallback.shopId && fallback.secretKey) {
      return { shopId: fallback.shopId, secretKey: fallback.secretKey };
    }
    return null;
  }

  /** Клиент API для тенанта; бросает 503, если эквайринг не настроен. */
  async client(tenantId: string): Promise<YooKassaClient> {
    const creds = await this.resolve(tenantId);
    if (!creds) {
      throw new ServiceUnavailableException(
        'Онлайн-оплата не настроена: не заданы ключи ЮKassa (shopId и секретный ключ)',
      );
    }
    return new YooKassaClient(creds);
  }

  /** Записать/обновить ключи тенанта (секрет ложится в БД зашифрованным). */
  async upsert(tenantId: string, shopId: string, secretKey: string): Promise<void> {
    const master = this.masterKey();
    if (isPlaceholderKey(master)) {
      throw new ServiceUnavailableException(
        'SECRETS_ENCRYPTION_KEY не задан: хранить секретный ключ ЮKassa в таком виде небезопасно',
      );
    }
    const secretCipher = encryptSecret(secretKey, master);
    await this.prisma.paymentCredential.upsert({
      where: { tenantId_provider: { tenantId, provider: PROVIDER } },
      create: { tenantId, provider: PROVIDER, shopId, secretCipher },
      update: { shopId, secretCipher },
    });
    this.logger.log(`Ключи ЮKassa обновлены: тенант=${tenantId} shopId=${shopId} secret=${maskSecret(secretKey)}`);
  }

  /**
   * Диагностика: откуда взяты ключи, что отвечает /v3/me и включены ли
   * способы оплаты. Секрет наружу не отдаём — только маску.
   */
  async diagnostics(tenantId: string) {
    const row = await this.prisma.paymentCredential.findUnique({
      where: { tenantId_provider: { tenantId, provider: PROVIDER } },
    });
    const creds = await this.resolve(tenantId);
    const master = this.masterKey();

    const base = {
      source: row ? ('db' as const) : creds ? ('env' as const) : ('none' as const),
      configured: !!creds,
      shopId: creds?.shopId ?? null,
      secretMasked: creds ? maskSecret(creds.secretKey) : null,
      encryptionKeyIsPlaceholder: isPlaceholderKey(master),
      receiptEnabled: this.config.get('yookassa', { infer: true }).receiptEnabled,
    };
    if (!creds) return { ...base, me: null, error: 'Ключи ЮKassa не заданы' };

    try {
      const me = await new YooKassaClient(creds).me();
      return {
        ...base,
        me: {
          accountId: me.account_id,
          status: me.status,
          test: me.test,
          fiscalizationEnabled: me.fiscalization_enabled ?? null,
          paymentMethods: me.payment_methods ?? [],
        },
        error: null,
      };
    } catch (e) {
      return { ...base, me: null, error: (e as Error).message };
    }
  }
}
