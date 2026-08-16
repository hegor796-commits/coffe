import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { StaffOrdersController } from './staff-orders.controller';
import { OrderPricingService } from './order-pricing.service';
import { OrderNumberService } from './order-number.service';
import { OrderTimeoutsProcessor } from './order-timeouts.processor';

@Module({
  controllers: [OrdersController, StaffOrdersController],
  providers: [OrdersService, OrderPricingService, OrderNumberService, OrderTimeoutsProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}
