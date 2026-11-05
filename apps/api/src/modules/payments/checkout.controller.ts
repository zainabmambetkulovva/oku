import { Body, Controller, HttpException, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { CheckoutDto } from '../orders/dto/checkout.dto';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from './payments.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class CheckoutController {
  constructor(
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
  ) {}

  /**
   * Оформление заказа из корзины. Для онлайн-оплаты сразу возвращается ссылка
   * на страницу оплаты; заказ нужно оплатить до expiresAt.
   * Если платёжная система не ответила, заказ создан, payment = null —
   * оплату можно повторить через POST /orders/:orderNumber/payments.
   */
  @Post()
  async checkout(@AuthUser() user: AuthenticatedUser, @Body() dto: CheckoutDto) {
    const order = await this.orders.checkout(user, dto);
    let payment = null;
    let paymentError: string | null = null;

    if (order.paymentMethod === 'ONLINE') {
      try {
        payment = await this.payments.start(order);
      } catch (error) {
        if (!(error instanceof HttpException)) {
          throw error;
        }
        paymentError = error.message;
      }
    }

    const fresh = await this.orders.findOwn(user, order.orderNumber);
    return { order: this.orders.toResponse(fresh), payment, paymentError };
  }

  /** Ссылка на оплату неоплаченного онлайн-заказа (повторная попытка). */
  @Post(':orderNumber/payments')
  pay(@AuthUser() user: AuthenticatedUser, @Param('orderNumber') orderNumber: string) {
    return this.payments.startForUser(user, orderNumber);
  }
}
