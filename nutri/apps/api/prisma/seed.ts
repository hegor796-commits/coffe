/**
 * Standalone-сев демо-кофейни (для локальной разработки: `pnpm db:seed`).
 * На проде сев выполняется на старте приложения (SeedService) — та же логика
 * из seed.core, единый источник правды.
 */
import { PrismaClient } from '@prisma/client';
import { seedDemo } from '../src/seed/seed.core';

const prisma = new PrismaClient();

seedDemo(prisma, { log: (m) => console.log(`[seed] ${m}`) })
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
