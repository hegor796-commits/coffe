import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentCredentialsService } from './payment-credentials.service';
import { PaymentsReconcileProcessor } from './payments-reconcile.processor';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, PaymentCredentialsService, PaymentsReconcileProcessor],
  exports: [PaymentsService, PaymentCredentialsService],
})
export class PaymentsModule {}
