import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis } from 'ioredis';
import { AppConfig } from '../config/configuration';

export const REDIS = Symbol('REDIS');

/** Общее подключение к Redis (кеш, pub/sub). BullMQ создаёт свои соединения. */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>): Redis =>
        new IORedis(config.get('redisUrl', { infer: true }), { maxRetriesPerRequest: null }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
