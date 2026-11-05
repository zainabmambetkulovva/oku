import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { buildSeries, SalesGroupBy } from './sales-series';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Выручка — сумма полученных оплат (онлайн и наличные при выполнении заказа)
 * без возвращённых и без оплат, ожидающих ручного разбора.
 */
const revenueWhere = (from?: Date, to?: Date): Prisma.PaymentWhereInput => ({
  status: 'SUCCEEDED',
  requiresReview: false,
  ...((from || to) && { paidAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
});

@Injectable()
export class AnalyticsService {
  private readonly lowStockThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    config: ConfigService<Env, true>,
  ) {
    this.lowStockThreshold = config.get('LOW_STOCK_THRESHOLD', { infer: true });
  }

  /** Главная панель статистики (ТЗ 13.1). */
  async dashboard() {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
      usersTotal,
      usersNew,
      booksTotal,
      booksActive,
      audiobooksTotal,
      audiobooksActive,
      ordersByStatus,
      revenueTotal,
      revenueMonth,
      paymentsToReview,
      recentOrders,
      popularBooks,
      popularAudiobooks,
      lowStock,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: monthAgo } } }),
      this.prisma.book.count({ where: { deletedAt: null } }),
      this.prisma.book.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.audiobook.count({ where: { deletedAt: null } }),
      this.prisma.audiobook.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.payment.aggregate({ where: revenueWhere(), _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: revenueWhere(monthAgo, now), _sum: { amount: true } }),
      this.prisma.payment.count({ where: { requiresReview: true } }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          orderNumber: true,
          status: true,
          total: true,
          paymentMethod: true,
          createdAt: true,
          recipientName: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.book.findMany({
        where: { deletedAt: null, salesCount: { gt: 0 } },
        orderBy: [{ salesCount: 'desc' }, { title: 'asc' }],
        take: 5,
        select: {
          id: true,
          slug: true,
          title: true,
          author: true,
          salesCount: true,
          coverKey: true,
        },
      }),
      this.prisma.audiobook.findMany({
        where: { deletedAt: null, salesCount: { gt: 0 } },
        orderBy: [{ salesCount: 'desc' }, { title: 'asc' }],
        take: 5,
        select: {
          id: true,
          slug: true,
          title: true,
          author: true,
          salesCount: true,
          coverKey: true,
        },
      }),
      this.prisma.book.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          stockQuantity: { lte: this.lowStockThreshold },
        },
        orderBy: [{ stockQuantity: 'asc' }, { title: 'asc' }],
        take: 10,
        select: { id: true, slug: true, title: true, stockQuantity: true },
      }),
    ]);

    const statuses = Object.fromEntries(
      Object.values(OrderStatus).map((status) => [status, 0]),
    ) as Record<OrderStatus, number>;
    for (const group of ordersByStatus) {
      statuses[group.status] = group._count._all;
    }
    const withCover = <T extends { coverKey: string | null }>({ coverKey, ...item }: T) => ({
      ...item,
      coverUrl: this.storage.publicUrl(coverKey),
    });

    return {
      users: { total: usersTotal, newLast30Days: usersNew },
      books: { total: booksTotal, active: booksActive },
      audiobooks: { total: audiobooksTotal, active: audiobooksActive },
      orders: {
        total: Object.values(statuses).reduce((sum, count) => sum + count, 0),
        byStatus: statuses,
      },
      sales: {
        currency: 'KGS',
        totalRevenue: revenueTotal._sum.amount ?? 0,
        revenueLast30Days: revenueMonth._sum.amount ?? 0,
      },
      alerts: {
        paymentsToReview,
        lowStockThreshold: this.lowStockThreshold,
        lowStockBooks: lowStock,
      },
      recentOrders,
      popular: {
        books: popularBooks.map(withCover),
        audiobooks: popularAudiobooks.map(withCover),
      },
    };
  }

  /** Выручка и число заказов по дням, неделям или месяцам (по времени Бишкека). */
  async sales(fromIso: string | undefined, toIso: string | undefined, groupBy: SalesGroupBy) {
    const to = toIso ? new Date(toIso) : new Date();
    const from = fromIso ? new Date(fromIso) : new Date(to.getTime() - 29 * DAY_MS);
    if (from > to) {
      throw new BadRequestException('from must not be later than to');
    }
    const maxDays = groupBy === 'day' ? 366 : 3 * 366;
    if (to.getTime() - from.getTime() > maxDays * DAY_MS) {
      throw new BadRequestException(`Period is too long for groupBy=${groupBy}`);
    }

    const payments = await this.prisma.payment.findMany({
      where: revenueWhere(from, to),
      select: { paidAt: true, amount: true, orderId: true },
    });
    const series = buildSeries(
      payments.map((payment) => ({ ...payment, paidAt: payment.paidAt! })),
      from,
      to,
      groupBy,
    );
    return {
      currency: 'KGS',
      groupBy,
      from: from.toISOString(),
      to: to.toISOString(),
      totalRevenue: series.reduce((sum, point) => sum + point.revenue, 0),
      totalOrders: new Set(payments.map((payment) => payment.orderId)).size,
      series,
    };
  }
}
