import { Injectable } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { ESCALATION_MINUTES, NOTIFY_JOBS } from '../queue/queue.constants';

/** Продюсер уведомлений: складывает задачи в очередь, доставка — в воркере. */
@Injectable()
export class NotificationsService {
  constructor(private readonly queue: QueueService) {}

  /** Новый заказ → персонал точки. Плюс отложенная эскалация. */
  async notifyNewOrder(orderId: string): Promise<void> {
    await this.queue.notifications.add(
      NOTIFY_JOBS.NewOrderToStaff,
      { orderId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true },
    );
    await this.queue.notifications.add(
      NOTIFY_JOBS.Escalation,
      { orderId },
      {
        delay: ESCALATION_MINUTES * 60_000,
        jobId: `escalation:${orderId}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  /** Смена статуса → клиент. */
  async notifyStatus(orderId: string): Promise<void> {
    await this.queue.notifications.add(
      NOTIFY_JOBS.StatusToClient,
      { orderId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true },
    );
  }
}
