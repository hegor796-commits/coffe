import { Body, Controller, Get, Put } from '@nestjs/common';
import { Role } from '@coffee/shared';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthContext } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { ZodBody } from '../common/zod.pipe';
import { PaymentCredentialsService } from './payment-credentials.service';

const credentialsSchema = z.object({
  shopId: z.string().min(1).max(64),
  secretKey: z.string().min(10).max(256),
});

/** Управление эквайрингом кофейни. Только владелец. */
@Controller('v1/admin/payments')
@Roles(Role.Owner)
export class AdminPaymentsController {
  constructor(private readonly creds: PaymentCredentialsService) {}

  /**
   * Диагностика подключения: откуда взяты ключи, что отвечает /v3/me,
   * какие способы оплаты реально включены в магазине. Секрет — маской.
   */
  @Get('diagnostics')
  diagnostics(@CurrentUser() user: AuthContext) {
    return this.creds.diagnostics(user.tenantId);
  }

  /** Записать ключи ЮKassa для своей кофейни (секрет шифруется в БД). */
  @Put('credentials')
  async setCredentials(
    @CurrentUser() user: AuthContext,
    @Body(new ZodBody(credentialsSchema)) dto: z.infer<typeof credentialsSchema>,
  ) {
    await this.creds.upsert(user.tenantId, dto.shopId, dto.secretKey);
    return this.creds.diagnostics(user.tenantId);
  }
}
