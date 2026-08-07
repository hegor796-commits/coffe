import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { RealtimeModule } from './realtime/realtime.module';
import { BotModule } from './bot/bot.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { StaffModule } from './staff/staff.module';
import { SeedModule } from './seed/seed.module';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'tma', 'dist'),
      exclude: ['/v1/*path', '/health', '/socket.io/*path'],
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    RealtimeModule,
    BotModule,
    NotificationsModule,
    AuthModule,
    MenuModule,
    OrdersModule,
    StaffModule,
    SeedModule,
  ],
  controllers: [HealthController],
  providers: [
    // JWT-guard применяется глобально; @Public() исключает конкретные ручки.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
