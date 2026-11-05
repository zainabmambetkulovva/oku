import {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination';
import { Trim } from '../../../common/validation/decorators';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class AdminOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  status?: OrderStatus;

  @IsOptional()
  @IsIn(Object.values(PaymentMethod))
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsIn(Object.values(DeliveryMethod))
  deliveryMethod?: DeliveryMethod;

  /** Номер заказа, e-mail покупателя, телефон или имя получателя */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  /** Заказы с платежами, требующими ручного разбора */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  requiresReview?: boolean;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export const ADMIN_ORDER_TARGETS = ['PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'] as const;

export class ChangeOrderStatusDto {
  /**
   * PROCESSING — принят в обработку, SHIPPED — отправлен, COMPLETED — выполнен,
   * CANCELLED — отменён. PAID ставит только платёжная система, REFUNDED — /refund
   */
  @IsIn(ADMIN_ORDER_TARGETS)
  status: (typeof ADMIN_ORDER_TARGETS)[number];

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class RefundOrderDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class AdminPaymentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  requiresReview?: boolean;

  @IsOptional()
  @IsIn(Object.values(PaymentStatus))
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  provider?: string;
}

export class ResolvePaymentDto {
  /** true — деньги возвращены покупателю у провайдера */
  @IsBoolean()
  refunded: boolean;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note: string;
}

export class AdminUsersQueryDto extends PaginationQueryDto {
  /** E-mail, имя, фамилия или телефон */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(Object.values(UserRole))
  role?: UserRole;

  @IsOptional()
  @IsIn(Object.values(UserStatus))
  status?: UserStatus;
}

export class ChangeUserStatusDto {
  /** BANNED и INACTIVE сразу завершают все сессии пользователя */
  @IsIn(Object.values(UserStatus))
  status: UserStatus;
}

export class ChangeUserRoleDto {
  @IsIn(Object.values(UserRole))
  role: UserRole;
}

export class AuditLogsQueryDto extends PaginationQueryDto {
  /** Действие целиком (book.update) или его начало (book.) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class SubscribersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;
}
