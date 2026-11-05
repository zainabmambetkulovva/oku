import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DeliveryMethod, OrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination';
import { IsPhone, Trim } from '../../../common/validation/decorators';

export const CHECKOUT_PAYMENT_METHODS = ['ONLINE', 'CASH'] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

export class DeliveryAddressDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  street: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  building: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  apartment?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}

export class CheckoutDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  recipientName: string;

  @IsPhone()
  recipientPhone: string;

  /** Обязателен, если в корзине есть печатные книги. Для заказа только из аудиокниг — не указывается */
  @IsOptional()
  @IsIn(Object.values(DeliveryMethod))
  deliveryMethod?: DeliveryMethod;

  /** Сохранённый адрес пользователя (для COURIER и POST) */
  @IsOptional()
  @IsUUID()
  addressId?: string;

  /** Адрес вручную, если не выбран сохранённый */
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  address?: DeliveryAddressDto;

  /** ONLINE — Finik (кошелёк, QR); CASH — наличными при получении (только печатные книги) */
  @IsIn(CHECKOUT_PAYMENT_METHODS)
  paymentMethod: CheckoutPaymentMethod;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  /** Сумма, которую видел покупатель (тыйын). Если цены изменились — 409, без заказа */
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedTotal?: number;
}

export class OrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  status?: OrderStatus;
}
