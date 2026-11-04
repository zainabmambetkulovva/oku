import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
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

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(@AuthUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.userId, dto);
  }

  @Get()
  async getUserOrders(@AuthUser() user: any, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.ordersService.getUserOrders(user.userId, page, limit);
  }

  @Get(':orderId')
  async findOne(@AuthUser() user: any, @Param('orderId') orderId: string) {
    const order = await this.ordersService.findOne(orderId);
    if (order.userId !== user.userId) {
      throw new Error('Access denied');
    }
    return order;
  }
}
