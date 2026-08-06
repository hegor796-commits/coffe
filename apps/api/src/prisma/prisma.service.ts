import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma-клиент с помощником forTenant: выполняет работу в транзакции,
 * выставив app.tenant_id (local) — так RLS-политики видят текущего тенанта.
 * Прикладной код всё равно фильтрует по tenantId явно (defense-in-depth).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Выполняет callback в транзакции, где выставлена сессионная переменная
   * app.tenant_id. Используется на запросах, где нужна RLS-изоляция.
   */
  async forTenant<T>(
    tenantId: string,
    fn: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
      return fn(tx);
    });
  }
}
