import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { QUEUES } from './queue.constants';

/** Продюсеры BullMQ. Воркеры создаются в соответствующих процессорах. */
@Injectable()
export class QueueService implements OnModuleDestroy {
  readonly notifications: Queue;
  readonly orderTimeouts: Queue;

  constructor(@Inject(REDIS) connection: Redis) {
    const opts = { connection };
    this.notifications = new Queue(QUEUES.Notifications, opts);
    this.orderTimeouts = new Queue(QUEUES.OrderTimeouts, opts);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.notifications.close(), this.orderTimeouts.close()]);
  }
}
