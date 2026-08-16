import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { seedDemo } from './seed.core';

/**
 * Идемпотентный сев демо-данных на старте приложения. Выполняется в том же
 * процессе и с тем же Prisma-клиентом, что и API, — в отличие от хрупкого
 * shell-шага `tsx prisma/seed.ts || echo skipped`, где сбой глушился и tenant
 * мог остаться без точки. Отключается через SEED_ON_BOOT=false.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_ON_BOOT === 'false') {
      this.logger.log('SEED_ON_BOOT=false — сев на старте пропущен.');
      return;
    }
    try {
      await seedDemo(this.prisma, { log: (m) => this.logger.log(m) });
    } catch (e) {
      // Сев не должен ронять запуск API — логируем и продолжаем.
      this.logger.error(`Сев на старте не удался: ${(e as Error).message}`);
    }
  }
}
