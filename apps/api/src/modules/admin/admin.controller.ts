import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaymentsService } from '../payments/payments.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminOrdersService } from './admin-orders.service';
import { AdminUsersService } from './admin-users.service';
import {
  AdminOrdersQueryDto,
  AdminPaymentsQueryDto,
  AdminUsersQueryDto,
  AuditLogsQueryDto,
  ChangeOrderStatusDto,
  ChangeUserRoleDto,
  ChangeUserStatusDto,
  RefundOrderDto,
  ResolvePaymentDto,
  SubscribersQueryDto,
} from './dto/admin.dto';

const actorOf = (user: AuthenticatedUser, ip: string) => ({ id: user.id, email: user.email, ip });

// ─── Заказы (ТЗ 13.4) ────────────────────────────────────────────────────────

@ApiTags('admin / orders')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  /** Поиск по номеру, e-mail, телефону, имени; фильтры по статусу, оплате, доставке, датам. */
  @Get()
  list(@Query() query: AdminOrdersQueryDto) {
    return this.orders.list(query);
  }

  /** Заказ с покупателем, историей статусов (кто менял) и платежами. */
  @Get(':orderNumber')
  get(@Param('orderNumber') orderNumber: string) {
    return this.orders.get(orderNumber);
  }

  @Patch(':orderNumber/status')
  changeStatus(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: ChangeOrderStatusDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.orders.changeStatus(orderNumber, dto, actorOf(user, ip));
  }

  /** Отметить возврат денег (выполнен в кабинете Finik или наличными). */
  @Post(':orderNumber/refund')
  @HttpCode(HttpStatus.OK)
  refund(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: RefundOrderDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.orders.refund(orderNumber, dto.comment, actorOf(user, ip));
  }
}

// ─── Платежи ─────────────────────────────────────────────────────────────────

@ApiTags('admin / payments')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly audit: AuditService,
  ) {}

  /** Платежи; requiresReview=true — требующие ручного разбора. */
  @Get()
  async list(@Query() query: AdminPaymentsQueryDto) {
    const where = {
      ...(query.requiresReview !== undefined && { requiresReview: query.requiresReview }),
      ...(query.status && { status: query.status }),
      ...(query.provider && { provider: query.provider }),
    };
    const [payments, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: { order: { select: { orderNumber: true, status: true, userId: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return paginated(payments, total, query);
  }

  /** Платёж разобран: например, деньги за отменённый заказ возвращены у провайдера. */
  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolvePaymentDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    const payment = await this.payments.resolveReview(id, dto.refunded, dto.note);
    await this.audit.log({
      actorId: user.id,
      action: 'payment.resolve',
      entityType: 'payment',
      entityId: id,
      newData: { refunded: dto.refunded, note: dto.note },
      ipAddress: ip,
    });
    return payment;
  }
}

// ─── Пользователи (ТЗ 13.5) ──────────────────────────────────────────────────

@ApiTags('admin / users')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly orders: AdminOrdersService,
  ) {}

  @Get()
  list(@Query() query: AdminUsersQueryDto) {
    return this.users.list(query);
  }

  /** Карточка пользователя со статистикой покупок. */
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.get(id);
  }

  @Get(':id/orders')
  ordersOf(@Param('id', ParseUUIDPipe) id: string, @Query() query: AdminOrdersQueryDto) {
    return this.orders.list({ ...query, userId: id });
  }

  /** ACTIVE / INACTIVE / BANNED. Блокировка сразу завершает все сессии. */
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeUserStatusDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.users.setStatus(id, dto.status, actorOf(user, ip));
  }

  /** Снять блокировку входа после неудачных попыток. */
  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  unlock(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.users.unlock(id, actorOf(user, ip));
  }

  /** Назначение роли — только менеджеры ролей (ROLE_MANAGER_EMAILS). */
  @Patch(':id/role')
  setRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeUserRoleDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.users.setRole(id, dto.role, actorOf(user, ip));
  }
}

// ─── Журнал действий и подписчики ────────────────────────────────────────────

@ApiTags('admin / audit')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditService) {}

  /** Журнал действий администраторов. */
  @Get('audit-logs')
  auditLogs(@Query() query: AuditLogsQueryDto) {
    return this.audit.auditLogs(query);
  }

  @Get('newsletter/subscribers')
  subscribers(@Query() query: SubscribersQueryDto) {
    return this.audit.subscribers(query);
  }

  /** CSV активных подписчиков (e-mail, дата подписки). Отдаётся файлом, без обёртки { data }. */
  @ApiProduces('text/csv')
  @Get('newsletter/subscribers/export')
  async exportSubscribers(@Res() res: Response): Promise<void> {
    const csv = await this.audit.subscribersCsv();
    res
      .status(200)
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader('Content-Disposition', 'attachment; filename="oku24-subscribers.csv"')
      .send(csv);
  }
}
