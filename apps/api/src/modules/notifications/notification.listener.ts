import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType, OrderStatus } from '@prisma/client';
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

const som = (tyiyn: number) => {
  const value = tyiyn / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace('.', ',')} сом`;
};

interface StatusNotice {
  type: NotificationType;
  title: string;
  message: (order: { orderNumber: string; isDigital: boolean; comment?: string }) => string;
  email: boolean;
}

const STATUS_NOTICES: Partial<Record<OrderStatus, StatusNotice>> = {
  PAID: {
    type: 'ORDER_PAID',
    title: 'Заказ оплачен',
    message: ({ orderNumber }) => `Оплата заказа ${orderNumber} получена. Мы начали его собирать.`,
    email: true,
  },
  PROCESSING: {
    type: 'ORDER_PROCESSING',
    title: 'Заказ принят в обработку',
    message: ({ orderNumber }) => `Заказ ${orderNumber} подтверждён и готовится к отправке.`,
    email: true,
  },
  SHIPPED: {
    type: 'ORDER_SHIPPED',
    title: 'Заказ отправлен',
    message: ({ orderNumber }) => `Заказ ${orderNumber} передан в доставку.`,
    email: true,
  },
  COMPLETED: {
    type: 'ORDER_COMPLETED',
    title: 'Заказ выполнен',
    message: ({ orderNumber, isDigital }) =>
      isDigital
        ? `Заказ ${orderNumber} оплачен. Аудиокниги доступны в разделе «Мои аудиокниги».`
        : `Заказ ${orderNumber} получен. Спасибо за покупку!`,
    email: true,
  },
  CANCELLED: {
    type: 'ORDER_CANCELLED',
    title: 'Заказ отменён',
    message: ({ orderNumber, comment }) =>
      comment === 'Payment time expired'
        ? `Заказ ${orderNumber} отменён: время на оплату истекло. Книги вернулись в продажу.`
        : `Заказ ${orderNumber} отменён.`,
    email: true,
  },
  REFUNDED: {
    type: 'ORDER_REFUNDED',
    title: 'Деньги возвращены',
    message: ({ orderNumber }) => `Оплата по заказу ${orderNumber} возвращена.`,
    email: true,
  },
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
      const deadline =
        order.paymentMethod === 'ONLINE' && order.expiresAt
          ? ` Оплатите его до ${order.expiresAt.toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Bishkek',
            })} (время Бишкека), иначе заказ будет отменён.`
          : order.paymentMethod === 'CASH'
            ? ' Оплата — наличными при получении.'
            : '';
      const message = `Заказ ${order.orderNumber} на сумму ${som(order.total)} оформлен.${deadline}`;
      await this.notify(order, 'ORDER_CREATED', 'Заказ оформлен', message, true);
    });
  }

  @OnEvent(DomainEvents.OrderStatusChanged)
  async onStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    await this.safely('order.status.changed', async () => {
      const notice = STATUS_NOTICES[event.newStatus];
      if (!notice) {
        return;
      }
      const order = await this.loadOrder(event.orderId);
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
      await this.notify(order, notice.type, notice.title, message, notice.email);
    });
  }

  @OnEvent(DomainEvents.AudioAccessGranted)
  async onAccessGranted(event: AudioAccessGrantedEvent): Promise<void> {
    // Доступ по заказу уже описан уведомлением о заказе
    if (event.source !== 'admin') {
      return;
    }
    await this.safely('audio.access.granted', async () => {
      const audiobook = await this.prisma.audiobook.findUniqueOrThrow({
        where: { id: event.audiobookId },
      });
      await this.notifications.create(
        event.userId,
        'ACCESS_GRANTED',
        'Открыт доступ к аудиокниге',
        `Аудиокнига «${audiobook.title}» доступна в разделе «Мои аудиокниги».`,
      );
    });
  }

  private loadOrder(orderId: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { user: { select: { email: true } }, items: true },
    });
  }

  private async notify(
    order: { userId: string; orderNumber: string; user: { email: string } },
    type: NotificationType,
    title: string,
    message: string,
    sendEmail: boolean,
  ): Promise<void> {
    await this.notifications.create(order.userId, type, title, message);
    if (sendEmail) {
      const url = `${this.frontendUrl}/orders/${order.orderNumber}`;
      await this.mail.send(
        orderMail(order.user.email, `${title} (${order.orderNumber})`, title, [message], url),
      );
    }
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
