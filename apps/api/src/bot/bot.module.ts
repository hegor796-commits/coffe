import { Global, Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';

@Global()
@Module({
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
