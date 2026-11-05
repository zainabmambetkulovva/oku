import { Module } from '@nestjs/common';
import { ListeningModule } from '../listening/listening.module';
import { DeliveryService } from './delivery.service';
import { OrderExpiryJob } from './order-expiry.job';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [ListeningModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService, DeliveryService, OrderExpiryJob],
  exports: [OrdersService, OrderLifecycleService],
})
export class OrdersModule {}
