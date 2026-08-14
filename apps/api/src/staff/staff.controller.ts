import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Role } from '@coffee/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthContext } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodBody } from '../common/zod.pipe';
import { StaffService } from './staff.service';

const toggleSchema = z
  .object({
    locationId: z.string().min(1),
    productId: z.string().uuid().optional(),
    optionId: z.string().uuid().optional(),
    stopped: z.boolean(),
    untilMinutes: z.number().int().positive().optional(),
  })
  .refine((v) => v.productId || v.optionId, { message: 'Укажите productId или optionId' });

const pauseSchema = z.object({
  locationId: z.string().min(1),
  accepting: z.boolean(),
});

/** Операции бариста: стоп-лист и пауза приёма заказов. */
@Controller('v1/staff')
@UseGuards(RolesGuard)
@Roles(Role.Barista, Role.Manager, Role.Owner)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get('stop-list')
  stopList(@CurrentUser() u: AuthContext, @Query('location') locationId: string) {
    return this.staff.listStopItems(u, locationId);
  }

  @Put('stop-list')
  toggle(@CurrentUser() u: AuthContext, @Body(new ZodBody(toggleSchema)) dto: z.infer<typeof toggleSchema>) {
    return this.staff.toggleStopItem(u, dto.locationId, dto);
  }

  @Put('location/pause')
  pause(@CurrentUser() u: AuthContext, @Body(new ZodBody(pauseSchema)) dto: z.infer<typeof pauseSchema>) {
    return this.staff.setAcceptingOrders(u, dto.locationId, dto.accepting);
  }
}
