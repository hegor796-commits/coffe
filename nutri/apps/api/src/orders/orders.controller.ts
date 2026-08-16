import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { createOrderSchema, type CreateOrderDto } from '@coffee/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthContext } from '../auth/auth.types';
import { ZodBody } from '../common/zod.pipe';
import { OrdersService } from './orders.service';

/** Заказы со стороны клиента. */
@Controller('v1/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodBody(createOrderSchema)) dto: CreateOrderDto,
  ) {
    return this.orders.create(user, dto);
  }

  @Get('my')
  listMine(@CurrentUser() user: AuthContext) {
    return this.orders.listMine(user);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.orders.getOne(user, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.orders.cancelByClient(user, id);
  }
}
