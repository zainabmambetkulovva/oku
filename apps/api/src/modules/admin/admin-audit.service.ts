import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsQueryDto, SubscribersQueryDto } from './dto/admin.dto';

/** Журнал действий и подписчики рассылки — только чтение. */
@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async auditLogs(query: AuditLogsQueryDto) {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('from must not be later than to');
    }
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action &&
        (query.action.endsWith('.')
          ? { action: { startsWith: query.action } }
          : { action: query.action })),
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.entityId && { entityId: query.entityId }),
      ...(query.userId && { userId: query.userId }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(logs, total, query);
  }

  async subscribers(query: SubscribersQueryDto) {
    const where = this.subscribersWhere(query);
    const [subscribers, total] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: [{ subscribedAt: 'desc' }, { id: 'asc' }],
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);
    return paginated(subscribers, total, query);
  }

  /** CSV активных подписчиков для сервиса рассылок. */
  async subscribersCsv(): Promise<string> {
    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      orderBy: { subscribedAt: 'asc' },
    });
    const rows = subscribers.map((s) =>
      [s.email, s.subscribedAt.toISOString()].map(csvCell).join(','),
    );
    return ['email,subscribed_at', ...rows].join('\n') + '\n';
  }

  private subscribersWhere(query: SubscribersQueryDto): Prisma.NewsletterSubscriberWhereInput {
    return {
      ...(query.status && { isActive: query.status === 'active' }),
      ...(query.search && { email: { contains: query.search, mode: 'insensitive' } }),
    };
  }
}

/** Значение CSV: кавычки при необходимости и защита от формул в Excel. */
function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
