import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainEventOutbox, DomainEventPublisher } from '../../common/events/domain-event-outbox';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { AdminActor } from '../categories/categories.service';
import { OrderLifecycleService } from '../orders/order-lifecycle.service';
import { toOrderResponse } from '../orders/order.mapper';
import { PaymentsService } from '../payments/payments.service';
import { StorageService } from '../storage/storage.service';
import { AdminOrdersQueryDto, ChangeOrderStatusDto } from './dto/admin.dto';

const adminOrderInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    include: { changedBy: { select: { id: true, email: true } } },
  },
  payments: { orderBy: { createdAt: 'asc' } },
  user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.OrderInclude;

type AdminOrder = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>;

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly payments: PaymentsService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
    private readonly events: DomainEventPublisher,
  ) {}

  async list(query: AdminOrdersQueryDto) {
    const where = this.where(query);
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: adminOrderInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginated(
      orders.map((order) => this.toResponse(order)),
      total,
      query,
    );
  }

  async get(orderNumber: string) {
    return this.toResponse(await this.find(orderNumber));
  }

  /**
   * Смена статуса администратором — только по разрешённым переходам.
   * Покупатель получает уведомление, действие пишется в журнал.
   */
  async changeStatus(orderNumber: string, dto: ChangeOrderStatusDto, actor: AdminActor) {
    const order = await this.find(orderNumber);
    const paid = order.payments.some((payment) => payment.status === 'SUCCEEDED');

    if (
      dto.status === 'PROCESSING' &&
      order.paymentMethod === 'ONLINE' &&
      order.status === 'PENDING'
    ) {
      throw new ConflictException('Online order is not paid yet');
    }
    if (dto.status === 'SHIPPED' && !['COURIER', 'POST'].includes(order.deliveryMethod ?? '')) {
      throw new ConflictException(
        'Only courier and post orders are shipped; complete pickup orders directly',
      );
    }
    if (dto.status === 'CANCELLED' && paid) {
      throw new ConflictException('Order is paid: refund it instead of cancelling');
    }

    const outbox = new DomainEventOutbox();
    const options = { changedById: actor.id, comment: dto.comment, outbox };
    await this.prisma.$transaction(async (tx) => {
      if (dto.status === 'CANCELLED') {
        await this.lifecycle.cancel(tx, order.id, options);
      } else {
        await this.lifecycle.transition(tx, order.id, dto.status, options);
      }
      if (dto.status === 'COMPLETED' && order.paymentMethod === 'CASH') {
        await this.payments.recordCashPayment(tx, order);
      }
      await this.audit.log(
        {
          actorId: actor.id,
          action: 'order.status',
          entityType: 'order',
          entityId: order.id,
          oldData: { status: order.status },
          newData: { status: dto.status, comment: dto.comment },
          ipAddress: actor.ip,
        },
        tx,
      );
    });

    if (dto.status === 'CANCELLED' || dto.status === 'COMPLETED') {
      await this.cache.invalidateCatalog();
    }
    await this.events.publish(outbox);
    return this.get(orderNumber);
  }

  /** Отметка о возврате денег (возврат выполнен в кабинете провайдера или наличными). */
  async refund(orderNumber: string, comment: string | undefined, actor: AdminActor) {
    const order = await this.find(orderNumber);
    await this.payments.refundByAdmin(order.id, actor.id, comment);
    await this.audit.log({
      actorId: actor.id,
      action: 'order.refund',
      entityType: 'order',
      entityId: order.id,
      oldData: { status: order.status },
      newData: { status: 'REFUNDED', comment },
      ipAddress: actor.ip,
    });
    return this.get(orderNumber);
  }

  private where(query: AdminOrdersQueryDto): Prisma.OrderWhereInput {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('from must not be later than to');
    }
    const search = query.search;
    return {
      ...(query.status && { status: query.status }),
      ...(query.paymentMethod && { paymentMethod: query.paymentMethod }),
      ...(query.deliveryMethod && { deliveryMethod: query.deliveryMethod }),
      ...(query.userId && { userId: query.userId }),
      ...(query.requiresReview && { payments: { some: { requiresReview: true } } }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { recipientName: { contains: search, mode: 'insensitive' } },
          { recipientPhone: { contains: search } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
  }

  private async find(orderNumber: string): Promise<AdminOrder> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: adminOrderInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private toResponse(order: AdminOrder) {
    const base = toOrderResponse(order, this.storage);
    return {
      ...base,
      customer: order.user,
      statusHistory: order.statusHistory.map((entry) => ({
        oldStatus: entry.oldStatus,
        newStatus: entry.newStatus,
        comment: entry.comment,
        changedBy: entry.changedBy,
        createdAt: entry.createdAt,
      })),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        paidAt: payment.paidAt,
        requiresReview: payment.requiresReview,
        reviewReason: payment.reviewReason,
        createdAt: payment.createdAt,
      })),
    };
  }
}
