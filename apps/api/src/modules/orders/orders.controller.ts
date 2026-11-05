import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { DeliveryService } from './delivery.service';
import { OrdersQueryDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';

/** Заказы покупателя. Оформление — POST /orders (модуль payments). */
@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly delivery: DeliveryService,
  ) {}

  /** Способы доставки и цены (тыйын). */
  @Public()
  @Get('delivery-options')
  deliveryOptions() {
    return this.delivery.options();
  }

  @ApiBearerAuth()
  @Get()
  list(@AuthUser() user: AuthenticatedUser, @Query() query: OrdersQueryDto) {
    return this.orders.list(user, query);
  }

  @ApiBearerAuth()
  @Get(':orderNumber')
  async findOne(@AuthUser() user: AuthenticatedUser, @Param('orderNumber') orderNumber: string) {
    return this.orders.toResponse(await this.orders.findOwn(user, orderNumber));
  }

  /** Отмена неоплаченного заказа. Книги возвращаются в продажу. */
  @ApiBearerAuth()
  @Post(':orderNumber/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@AuthUser() user: AuthenticatedUser, @Param('orderNumber') orderNumber: string) {
    return this.orders.toResponse(await this.orders.cancelByUser(user, orderNumber));
  }
}
