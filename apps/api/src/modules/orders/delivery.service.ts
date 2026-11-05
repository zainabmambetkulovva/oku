import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryMethod } from '@prisma/client';
import { Env } from '../../config/env';

/** Тарифы доставки (тыйын). Самовывоз бесплатный; курьер и почта — из настроек. */
@Injectable()
export class DeliveryService {
  private readonly prices: Record<DeliveryMethod, number>;

  constructor(config: ConfigService<Env, true>) {
    this.prices = {
      PICKUP: 0,
      COURIER: config.get('DELIVERY_PRICE_COURIER', { infer: true }),
      POST: config.get('DELIVERY_PRICE_POST', { infer: true }),
    };
  }

  options() {
    return (Object.keys(this.prices) as DeliveryMethod[]).map((method) => ({
      method,
      price: this.prices[method],
      currency: 'KGS',
      requiresAddress: this.requiresAddress(method),
    }));
  }

  price(method: DeliveryMethod): number {
    return this.prices[method];
  }

  requiresAddress(method: DeliveryMethod): boolean {
    return method === 'COURIER' || method === 'POST';
  }

  assertMethod(method: DeliveryMethod | undefined): DeliveryMethod {
    if (!method) {
      throw new BadRequestException('Choose a delivery method for printed books');
    }
    return method;
  }
}
