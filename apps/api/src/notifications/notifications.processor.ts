import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { formatMoney, OrderStatus, type OrderItemSnapshot } from '@coffee/shared';
import { REDIS } from '../redis/redis.module';
import { QUEUES, NOTIFY_JOBS } from '../queue/queue.constants';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from '../bot/bot.service';

/**
 * Воркер доставки уведомлений через Telegram-бот.
 * Резолвит получателей (персонал точки, клиент) и шлёт сообщения.
 */
@Injectable()
export class NotificationsProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private worker!: Worker;

  constructor(
    @Inject(REDIS) private readonly connection: Redis,
    private readonly prisma: PrismaService,
    private readonly bot: BotService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(QUEUES.Notifications, (job) => this.handle(job), {
      connection: this.connection,
      concurrency: 5,
    });
    this.worker.on('failed', (job, err) =>
      this.logger.warn(`Notify job ${job?.name} failed: ${err.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async handle(job: Job<{ orderId: string }>): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: job.data.orderId },
      include: { customer: true, location: true },
    });
    if (!order) return;

    const readyAt = order.readyAtPromised
      ? this.formatTime(order.readyAtPromised, order.location.timezone)
      : null;

    switch (job.name) {
      case NOTIFY_JOBS.NewOrderToStaff: {
        const staff = await this.prisma.staffUser.findMany({
          where: {
            tenantId: order.tenantId,
            isActive: true,
            OR: [{ locationId: order.locationId }, { role: 'owner' }, { role: 'manager' }],
          },
        });
        const items = order.items as unknown as OrderItemSnapshot[];
        const summary = items
          .map((i) => `• ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
          .join('\n');
        const { text, keyboard } = this.bot.newOrderMessage({
          id: order.id,
          number: order.number,
          itemsSummary: summary,
          readyAt,
          total: formatMoney(order.total),
        });
        for (const s of staff) {
          await this.bot.safeSend(s.tgUserId, text, keyboard);
        }
        break;
      }

      case NOTIFY_JOBS.StatusToClient: {
        const text = this.bot.statusMessage(order.number, order.status, readyAt);
        await this.bot.safeSend(order.customer.tgUserId, text);
        break;
      }

      case NOTIFY_JOBS.Escalation: {
        // Эскалация актуальна, только если заказ всё ещё не принят.
        if (order.status !== OrderStatus.Created && order.status !== OrderStatus.Paid) return;
        const staff = await this.prisma.staffUser.findMany({
          where: { tenantId: order.tenantId, isActive: true },
        });
        for (const s of staff) {
          await this.bot.safeSend(
            s.tgUserId,
            `⚠️ Заказ ${order.number} ждёт принятия уже несколько минут. Откройте приложение.`,
          );
        }
        break;
      }
    }
  }

  private formatTime(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(date);
  }
}
