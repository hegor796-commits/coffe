import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';
import { BotService } from './bot.service';
import { AppConfig } from '../config/configuration';

/** Webhook Telegram. Проверяем секретный заголовок из настроек бота. */
@Controller('v1/webhooks/telegram')
export class BotController {
  private readonly secret: string;

  constructor(
    private readonly bot: BotService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.secret = config.get('telegram', { infer: true }).webhookSecret;
  }

  @Public()
  @Post()
  @HttpCode(200)
  async webhook(
    @Body() update: unknown,
    @Headers('x-telegram-bot-api-secret-token') secretHeader?: string,
  ) {
    if (this.secret && secretHeader !== this.secret) {
      throw new UnauthorizedException('Неверный секрет webhook');
    }
    await this.bot.handleUpdate(update);
    return { ok: true };
  }
}
