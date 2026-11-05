import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsQueryDto } from './dto/notifications.dto';

/** Уведомления в личном кабинете. */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, type: NotificationType, title: string, message: string) {
    return this.prisma.notification.create({ data: { userId, type, title, message } });
  }

  async list(userId: string, query: NotificationsQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly && { isRead: false }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginated(items, total, query);
  }

  async unreadCount(userId: string): Promise<{ unread: number }> {
    return { unread: await this.prisma.notification.count({ where: { userId, isRead: false } }) };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.isRead) {
      return notification;
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: count };
  }
}
