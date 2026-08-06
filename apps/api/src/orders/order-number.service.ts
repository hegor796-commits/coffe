import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';

/**
 * Короткие человекочитаемые номера заказов вида "A-17", уникальные в пределах
 * точки и дня. Счётчик — атомарный INCR в Redis с суточным TTL.
 * Буква ротируется по сотням, чтобы номера не росли бесконечно.
 */
@Injectable()
export class OrderNumberService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async next(locationId: string, timezone: string): Promise<string> {
    const dayKey = this.localDayKey(timezone);
    const key = `ordernum:${locationId}:${dayKey}`;
    const seq = await this.redis.incr(key);
    if (seq === 1) {
      // TTL 36 часов: покрывает сутки + запас на разницу поясов.
      await this.redis.expire(key, 36 * 3600);
    }
    const letter = String.fromCharCode(65 + (Math.floor((seq - 1) / 99) % 26)); // A..Z
    const num = ((seq - 1) % 99) + 1;
    return `${letter}-${num}`;
  }

  private localDayKey(timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(new Date());
  }
}
