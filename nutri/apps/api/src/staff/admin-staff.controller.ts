import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { inviteStaffSchema, Role, type InviteStaffDto } from '@coffee/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthContext } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodBody } from '../common/zod.pipe';
import { StaffService } from './staff.service';

const locationSchema = z.object({
  name: z.string().min(1).max(160),
  address: z.string().max(300).optional(),
  timezone: z.string().default('Europe/Moscow'),
  maxOrdersPerSlot: z.number().int().positive().default(5),
  slotMinutes: z.number().int().positive().default(15),
});

/** Управление сотрудниками и точками (владелец/менеджер). */
@Controller('v1/admin')
@UseGuards(RolesGuard)
@Roles(Role.Owner, Role.Manager)
export class AdminStaffController {
  private readonly botUsername: string;

  constructor(
    private readonly staff: StaffService,
    config: ConfigService,
  ) {
    // Имя бота нужно для сборки deep-link приглашения.
    this.botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'your_bot';
  }

  @Get('staff')
  list(@CurrentUser() u: AuthContext) {
    return this.staff.listStaff(u.tenantId);
  }

  @Post('staff/invite')
  invite(@CurrentUser() u: AuthContext, @Body(new ZodBody(inviteStaffSchema)) dto: InviteStaffDto) {
    return this.staff.createInvite(u.tenantId, this.botUsername, dto);
  }

  @Delete('staff/:id')
  deactivate(@CurrentUser() u: AuthContext, @Param('id') id: string) {
    return this.staff.deactivateStaff(u.tenantId, id);
  }

  @Get('locations')
  locations(@CurrentUser() u: AuthContext) {
    return this.staff.listLocations(u.tenantId);
  }

  @Post('locations')
  createLocation(
    @CurrentUser() u: AuthContext,
    @Body(new ZodBody(locationSchema)) dto: z.infer<typeof locationSchema>,
  ) {
    return this.staff.createLocation(u.tenantId, dto);
  }

  @Put('locations/:id')
  updateLocation(
    @CurrentUser() u: AuthContext,
    @Param('id') id: string,
    @Body(new ZodBody(locationSchema.partial())) dto: Partial<z.infer<typeof locationSchema>>,
  ) {
    return this.staff.updateLocation(u.tenantId, id, dto);
  }
}
