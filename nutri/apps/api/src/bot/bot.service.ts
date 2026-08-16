import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard } from 'grammy';
import { AppConfig } from '../config/configuration';

/**
 * Telegram-бот платформы. Два назначения:
 *  1) приём апдейтов (webhook) — команды /start, deep-links;
 *  2) отправка уведомлений (новый заказ бариста, статусы клиенту) — основной
 *     надёжный канал доставки, т.к. Mini App не работает в фоне.
 */
@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  readonly bot: Bot;
  private readonly appUrl: string;
  private readonly botUsername: string | null = null;

  private readonly webhookUrl: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const tg = config.get('telegram', { infer: true });
    this.appUrl = config.get('publicAppUrl', { infer: true });
    this.bot = new Bot(tg.botToken);
    this.webhookUrl = tg.webhookUrl;
    this.webhookSecret = tg.webhookSecret;
  }

  async onModuleInit(): Promise<void> {
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        'Добро пожаловать в «Любовь-Марковь» ☕\nОткройте мини-приложение, чтобы сделать заказ без очереди.',
        {
          reply_markup: new InlineKeyboard().webApp('Открыть меню', this.appUrl),
        },
      );
    });

    // В webhook-режиме бот должен знать свои данные (botInfo) до обработки
    // апдейтов — иначе handleUpdate падает с "Bot not initialized".
    try {
      await this.bot.init();
    } catch (e) {
      this.logger.error(`Не удалось инициализировать бота (getMe): ${(e as Error).message}`);
    }

    if (this.webhookUrl) {
      try {
        await this.bot.api.setWebhook(this.webhookUrl, {
          secret_token: this.webhookSecret,
          drop_pending_updates: true,
        });
        this.logger.log(`Webhook зарегистрирован: ${this.webhookUrl}`);
      } catch (e) {
        this.logger.error(`Не удалось установить webhook: ${(e as Error).message}`);
      }
    }

    this.logger.log('Бот инициализирован');
  }

  /** Обрабатывает один апдейт от Telegram (вызывается из webhook-контроллера). */
  async handleUpdate(update: unknown): Promise<void> {
    await this.bot.handleUpdate(update as Parameters<Bot['handleUpdate']>[0]);
  }

  /** Ссылка обратно в Mini App на конкретный экран. */
  private deepLink(path: string): string {
    return `${this.appUrl}${path}`;
  }

  /** Отправляет сообщение, не роняя вызывающий код при ошибке доставки. */
  async safeSend(
    tgUserId: string,
    text: string,
    keyboard?: InlineKeyboard,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.bot.api.sendMessage(tgUserId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      return { ok: true };
    } catch (e) {
      this.logger.warn(`Не удалось отправить сообщение ${tgUserId}: ${(e as Error).message}`);
      return { ok: false, error: (e as Error).message };
    }
  }

  /** Уведомление бариста/владельцу о новом заказе. */
  newOrderMessage(order: {
    id: string;
    number: string;
    itemsSummary: string;
    readyAt: string | null;
    total: string;
  }): { text: string; keyboard: InlineKeyboard } {
    const when = order.readyAt ? `к ${order.readyAt}` : 'как можно скорее';
    return {
      text:
        `🆕 <b>Новый заказ ${order.number}</b>\n` +
        `${order.itemsSummary}\n` +
        `Готовность: ${when}\n` +
        `Сумма: ${order.total}`,
      keyboard: new InlineKeyboard().webApp('Открыть заказ', this.deepLink(`/#/staff/${order.id}`)),
    };
  }

  /** Уведомление клиенту о смене статуса. */
  statusMessage(number: string, status: string, readyAt: string | null): string {
    switch (status) {
      case 'accepted':
        return `✅ Заказ ${number} принят${readyAt ? `, будет готов к ${readyAt}` : ''}.`;
      case 'preparing':
        return `👨‍🍳 Готовим заказ ${number}.`;
      case 'ready':
        return `☕️ Заказ ${number} готов! Можно забирать.`;
      case 'completed':
        return `Спасибо! Заказ ${number} выдан. Ждём снова 🙌`;
      case 'rejected':
        return `😔 К сожалению, заказ ${number} отклонён. Средства не списаны / будут возвращены.`;
      case 'auto_cancelled':
        return `⌛️ Заказ ${number} отменён: кофейня не приняла его вовремя. Приносим извинения.`;
      default:
        return `Статус заказа ${number}: ${status}`;
    }
  }
}
