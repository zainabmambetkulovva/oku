import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';

export class CreateOrderDto {
  recipientName: string;
  recipientPhone: string;
  deliveryAddress?: string;
  deliveryMethod?: 'COURIER' | 'PICKUP' | 'POST';
  paymentMethod?: 'CARD' | 'CASH' | 'TERMINAL' | 'ONLINE' | 'QR';
  discount?: number;
  comment?: string;
}

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(@AuthUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  async getUserOrders(
    @AuthUser() user: AuthenticatedUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.ordersService.getUserOrders(user.id, page, limit);
  }

  @Get(':orderId')
  async findOne(@AuthUser() user: AuthenticatedUser, @Param('orderId') orderId: string) {
    const order = await this.ordersService.findOne(orderId);
    if (order.userId !== user.id) {
      throw new Error('Access denied');
    }
    return order;
  }
}
