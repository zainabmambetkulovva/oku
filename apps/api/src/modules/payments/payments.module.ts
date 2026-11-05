import { Module } from '@nestjs/common';
import { ListeningModule } from '../listening/listening.module';
import { OrdersModule } from '../orders/orders.module';
import { CheckoutController } from './checkout.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FinikPaymentProvider } from './providers/finik.provider';
import { TestPaymentProvider } from './providers/test.provider';

@Module({
  imports: [OrdersModule, ListeningModule],
  controllers: [CheckoutController, PaymentsController],
  providers: [PaymentsService, TestPaymentProvider, FinikPaymentProvider],
})
export class PaymentsModule {}
