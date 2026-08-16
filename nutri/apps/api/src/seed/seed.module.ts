import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';

/** Идемпотентный сев демо-данных на старте (PrismaModule — глобальный). */
@Module({
  providers: [SeedService],
})
export class SeedModule {}
