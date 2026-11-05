import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminAuditService } from './admin-audit.service';
import { AdminOrdersService } from './admin-orders.service';
import { AdminUsersService } from './admin-users.service';
import {
  AdminAuditController,
  AdminOrdersController,
  AdminPaymentsController,
  AdminUsersController,
} from './admin.controller';

@Module({
  imports: [AuthModule, OrdersModule, PaymentsModule],
  controllers: [
    AdminOrdersController,
    AdminPaymentsController,
    AdminUsersController,
    AdminAuditController,
  ],
  providers: [AdminOrdersService, AdminUsersService, AdminAuditService],
})
export class AdminModule {}
