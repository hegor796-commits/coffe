import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrderEvent, Role } from '@coffee/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthContext } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrdersService } from './orders.service';

/** Управление заказами со стороны бариста/менеджера/владельца. */
@Controller('v1/staff/orders')
@UseGuards(RolesGuard)
@Roles(Role.Barista, Role.Manager, Role.Owner)
export class StaffOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  active(@CurrentUser() user: AuthContext, @Query('location') locationId: string) {
    return this.orders.listActive(user, locationId);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.orders.staffTransition(user, id, OrderEvent.Accept);
  }

  @Post(':id/preparing')
  preparing(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.orders.staffTransition(user, id, OrderEvent.StartPreparing);
  }

  @Post(':id/ready')
  ready(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.orders.staffTransition(user, id, OrderEvent.MarkReady);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.orders.staffTransition(user, id, OrderEvent.Complete);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.orders.staffTransition(user, id, OrderEvent.Reject);
  }
}
