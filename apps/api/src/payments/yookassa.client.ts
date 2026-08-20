import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

const API_BASE = 'https://api.yookassa.ru/v3';

export interface YooKassaCreds {
  shopId: string;
  secretKey: string;
}

/** Статусы платежа в ЮKassa. */
export type YooPaymentStatus = 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';

export interface YooPayment {
  id: string;
  status: YooPaymentStatus;
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  cancellation_details?: { party: string; reason: string };
  payment_method?: { type: string; id?: string; title?: string };
  metadata?: Record<string, string>;
  test?: boolean;
}

export interface YooMe {
  account_id: string;
  status: string;
  test: boolean;
  fiscalization_enabled?: boolean;
  payment_methods?: string[];
}

export interface YooReceiptItem {
  description: string;
  quantity: string;
  amount: { value: string; currency: string };
  vat_code: number;
  payment_subject: string;
  payment_mode: string;
}

export interface CreatePaymentInput {
  amountValue: string;
  description: string;
  returnUrl: string;
  idempotenceKey: string;
  metadata: Record<string, string>;
  receipt?: {
    customer: { email?: string; phone?: string };
    items: YooReceiptItem[];
  };
}

/** Ошибка вызова API ЮKassa с сохранением кода и тела ответа. */
export class YooKassaError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'YooKassaError';
  }
}

/**
 * Тонкий клиент API ЮKassa (v3). Авторизация — HTTP Basic: shopId как логин,
 * секретный ключ как пароль. Никаких SDK: нужны четыре ручки.
 */
export class YooKassaClient {
  private readonly logger = new Logger('YooKassa');

  constructor(private readonly creds: YooKassaCreds) {}

  private authHeader(): string {
    const raw = `${this.creds.shopId}:${this.creds.secretKey}`;
    return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: { body?: unknown; idempotenceKey?: string } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: this.authHeader(),
      'Content-Type': 'application/json',
    };
    // ЮKassa требует Idempotence-Key на всех POST: повтор с тем же ключом
    // возвращает тот же платёж, а не создаёт второй.
    if (method === 'POST') headers['Idempotence-Key'] = opts.idempotenceKey ?? randomUUID();

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (!res.ok) {
      const description =
        (parsed as { description?: string })?.description ?? `HTTP ${res.status}`;
      this.logger.warn(`${method} ${path} → ${res.status}: ${description}`);
      throw new YooKassaError(res.status, description, parsed);
    }
    return parsed as T;
  }

  /** Информация о магазине: статус, тестовость, включённые способы оплаты. */
  me(): Promise<YooMe> {
    return this.request<YooMe>('GET', '/me');
  }

  createPayment(input: CreatePaymentInput): Promise<YooPayment> {
    return this.request<YooPayment>('POST', '/payments', {
      idempotenceKey: input.idempotenceKey,
      body: {
        amount: { value: input.amountValue, currency: 'RUB' },
        // Списываем сразу: двухстадийная схема для кофе не нужна.
        capture: true,
        confirmation: { type: 'redirect', return_url: input.returnUrl },
        description: input.description,
        metadata: input.metadata,
        ...(input.receipt ? { receipt: input.receipt } : {}),
      },
    });
  }

  getPayment(paymentId: string): Promise<YooPayment> {
    return this.request<YooPayment>('GET', `/payments/${paymentId}`);
  }

  createRefund(paymentId: string, amountValue: string, idempotenceKey: string): Promise<{ id: string; status: string }> {
    return this.request('POST', '/refunds', {
      idempotenceKey,
      body: {
        payment_id: paymentId,
        amount: { value: amountValue, currency: 'RUB' },
      },
    });
  }
}

/** Копейки → строка вида "123.45", как требует API. */
export function kopecksToValue(kopecks: number): string {
  return (kopecks / 100).toFixed(2);
}
