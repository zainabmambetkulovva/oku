import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType, OrderStatus } from '@prisma/client';
import { toSiteLocale } from '../auth/auth.constants';
import {
  type AudioAccessGrantedEvent,
  DomainEvents,
  type OrderCreatedEvent,
  type OrderStatusChangedEvent,
} from '../../common/events/domain-events';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { orderMail } from '../mail/mail.templates';
import { NotificationsService } from './notifications.service';
import { ACCESS_GRANTED, createdNotice, statusNotice } from './order-notices';

/** Тип уведомления в кабинете по новому статусу заказа (письмо уходит всегда). */
const STATUS_TYPES: Partial<Record<OrderStatus, NotificationType>> = {
  PAID: 'ORDER_PAID',
  PROCESSING: 'ORDER_PROCESSING',
  SHIPPED: 'ORDER_SHIPPED',
  COMPLETED: 'ORDER_COMPLETED',
  CANCELLED: 'ORDER_CANCELLED',
  REFUNDED: 'ORDER_REFUNDED',
};

/**
 * Реакция на доменные события: уведомление в личном кабинете и письмо.
 * Ошибка здесь не влияет на заказ или оплату — она только записывается в лог.
 */
@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true }).replace(/\/+$/, '');
  }

  @OnEvent(DomainEvents.OrderCreated)
  async onOrderCreated({ orderId }: OrderCreatedEvent): Promise<void> {
    await this.safely('order.created', async () => {
      const order = await this.loadOrder(orderId);
      const { title, message } = createdNotice(toSiteLocale(order.user.locale), order);
      await this.notify(order, 'ORDER_CREATED', title, message);
    });
  }

  @OnEvent(DomainEvents.OrderStatusChanged)
  async onStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    await this.safely('order.status.changed', async () => {
      const type = STATUS_TYPES[event.newStatus];
      if (!type) {
        return;
      }
      const order = await this.loadOrder(event.orderId);
      const notice = statusNotice(toSiteLocale(order.user.locale), event.newStatus)!;
      const isDigital = order.items.every((item) => item.productType === 'AUDIOBOOK');
      // Заказ из аудиокниг сразу переходит PAID → COMPLETED: сообщаем один раз
      if (event.newStatus === 'PAID' && isDigital) {
        return;
      }
      const message = notice.message({
        orderNumber: order.orderNumber,
        isDigital,
        comment: event.comment,
      });
      await this.notify(order, type, notice.title, message);
    });
  }

  @OnEvent(DomainEvents.AudioAccessGranted)
  async onAccessGranted(event: AudioAccessGrantedEvent): Promise<void> {
    // Доступ по заказу уже описан уведомлением о заказе
    if (event.source !== 'admin') {
      return;
    }
    await this.safely('audio.access.granted', async () => {
      const [audiobook, user] = await Promise.all([
        this.prisma.audiobook.findUniqueOrThrow({ where: { id: event.audiobookId } }),
        this.prisma.user.findUniqueOrThrow({
          where: { id: event.userId },
          select: { locale: true },
        }),
      ]);
      const { title, message } = ACCESS_GRANTED[toSiteLocale(user.locale)](audiobook.title);
      await this.notifications.create(event.userId, 'ACCESS_GRANTED', title, message);
    });
  }

  private loadOrder(orderId: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { user: { select: { email: true, locale: true } }, items: true },
    });
  }

  /** Уведомление в кабинете и письмо со ссылкой на заказ — на языке покупателя. */
  private async notify(
    order: { userId: string; orderNumber: string; user: { email: string; locale: string } },
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    await this.notifications.create(order.userId, type, title, message);
    const locale = toSiteLocale(order.user.locale);
    const url = `${this.frontendUrl}/${locale}/orders/${order.orderNumber}`;
    await this.mail.send(
      orderMail(order.user.email, `${title} (${order.orderNumber})`, title, [message], url, locale),
    );
  }

  private async safely(event: string, handler: () => Promise<void>): Promise<void> {
    try {
      await handler();
    } catch (error) {
      this.logger.error(
        `Failed to handle ${event}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
