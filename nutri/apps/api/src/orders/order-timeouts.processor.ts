import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { QUEUES, TIMEOUT_JOBS } from '../queue/queue.constants';
import { OrdersService } from './orders.service';

/** Воркер таймаутов: автоотмена непринятых заказов. */
@Injectable()
export class OrderTimeoutsProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderTimeoutsProcessor.name);
  private worker!: Worker;

  constructor(
    @Inject(REDIS) private readonly connection: Redis,
    private readonly orders: OrdersService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      QUEUES.OrderTimeouts,
      async (job: Job<{ orderId: string }>) => {
        if (job.name === TIMEOUT_JOBS.AutoCancel) {
          await this.orders.autoCancel(job.data.orderId);
        }
      },
      { connection: this.connection, concurrency: 5 },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.warn(`Timeout job ${job?.id} failed: ${err.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
