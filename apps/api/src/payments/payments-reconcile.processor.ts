import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { PAYMENT_JOBS, QUEUES, RECONCILE_INTERVAL_MS } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { PaymentsService } from './payments.service';

/**
 * Воркер платёжной очереди: возвраты (с ретраями) и периодическая сверка
 * зависших платежей — уведомление от ЮKassa может не дойти.
 */
@Injectable()
export class PaymentsReconcileProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PaymentsWorker');
  private worker!: Worker;

  constructor(
    @Inject(REDIS) private readonly connection: Redis,
    private readonly queue: QueueService,
    private readonly payments: PaymentsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      QUEUES.Payments,
      async (job: Job<{ orderId?: string }>) => {
        if (job.name === PAYMENT_JOBS.Refund && job.data.orderId) {
          await this.payments.refundIfNeeded(job.data.orderId);
        } else if (job.name === PAYMENT_JOBS.Reconcile) {
          await this.payments.reconcile();
        }
      },
      { connection: this.connection, concurrency: 3 },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.warn(`Задача ${job?.name} (${job?.id}) не выполнена: ${err.message}`),
    );

    // Повторяемая сверка. Без Redis приложение работать продолжает — просто
    // без автосверки. Таймаут обязателен: ioredis ждёт соединение молча, и
    // без него недоступный Redis подвесил бы старт приложения целиком.
    try {
      await Promise.race([
        this.queue.payments.add(
          PAYMENT_JOBS.Reconcile,
          {},
          {
            repeat: { every: RECONCILE_INTERVAL_MS },
            jobId: 'payments-reconcile',
            removeOnComplete: true,
            removeOnFail: true,
          },
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('таймаут 5с')), 5000)),
      ]);
    } catch (e) {
      this.logger.warn(`Периодическая сверка платежей не запущена: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
