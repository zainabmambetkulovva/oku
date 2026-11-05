import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { sourcesFor, STOCK_RESERVED_STATUSES } from './order-status';

type Tx = Prisma.TransactionClient;

export interface TransitionOptions {
  /** Кто изменил статус; null — система (оплата, истечение срока) */
  changedById?: string | null;
  comment?: string;
}

/**
 * Изменение статуса заказа: только по разрешённым переходам, атомарно
 * (условие на текущий статус в самом UPDATE) и с записью в историю.
 */
@Injectable()
export class OrderLifecycleService {
  private readonly logger = new Logger(OrderLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async transition(
    tx: Tx,
    orderId: string,
    to: OrderStatus,
    options: TransitionOptions = {},
    allowedFrom: readonly OrderStatus[] = sourcesFor(to),
  ): Promise<Order> {
    const current = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const from = allowedFrom.filter((status) => sourcesFor(to).includes(status));

    const now = new Date();
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: { in: from } },
      data: {
        status: to,
        ...(to === 'COMPLETED' && { completedAt: now }),
        ...(to === 'CANCELLED' && { cancelledAt: now }),
      },
    });
    if (count === 0) {
      throw new ConflictException(`Order cannot be moved from ${current.status} to ${to}`);
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        oldStatus: current.status,
        newStatus: to,
        changedById: options.changedById ?? null,
        comment: options.comment,
      },
    });
    return tx.order.findUniqueOrThrow({ where: { id: orderId } });
  }

  /**
   * Отмена: остатки книг возвращаются на склад, ожидающие платежи отменяются.
   * Вызывать внутри транзакции.
   */
  async cancel(
    tx: Tx,
    orderId: string,
    options: TransitionOptions,
    allowedFrom?: readonly OrderStatus[],
  ): Promise<Order> {
    const before = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const order = await this.transition(tx, orderId, 'CANCELLED', options, allowedFrom);

    if (STOCK_RESERVED_STATUSES.includes(before.status)) {
      await this.restoreStock(tx, orderId);
    }
    await tx.payment.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    return order;
  }

  async restoreStock(tx: Tx, orderId: string): Promise<void> {
    const items = await tx.orderItem.findMany({
      where: { orderId, productType: 'BOOK', bookId: { not: null } },
    });
    for (const item of items) {
      await tx.book.update({
        where: { id: item.bookId! },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }
  }

  /**
   * Отмена онлайн-заказов, не оплаченных вовремя. Возвращает число отменённых.
   * Если оплата всё же придёт позже, платёж будет помечен для ручного разбора.
   */
  async expireUnpaid(now = new Date()): Promise<number> {
    const expired = await this.prisma.order.findMany({
      where: { status: 'PENDING', paymentMethod: 'ONLINE', expiresAt: { lte: now } },
      select: { id: true, orderNumber: true },
      take: 100,
    });

    let cancelled = 0;
    for (const order of expired) {
      try {
        await this.prisma.$transaction((tx) =>
          this.cancel(tx, order.id, { comment: 'Payment time expired' }, ['PENDING']),
        );
        cancelled++;
      } catch (error) {
        // Заказ успели оплатить или отменить — пропускаем
        if (!(error instanceof ConflictException)) {
          throw error;
        }
      }
    }

    if (cancelled > 0) {
      this.logger.log(`Cancelled ${cancelled} unpaid order(s)`);
      await this.cache.invalidateCatalog();
    }
    return cancelled;
  }
}
