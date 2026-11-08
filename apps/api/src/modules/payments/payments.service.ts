import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, Payment, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainEventOutbox, DomainEventPublisher } from '../../common/events/domain-event-outbox';
import { DomainEvents } from '../../common/events/domain-events';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AudioAccessService } from '../listening/audio-access.service';
import { OrderLifecycleService } from '../orders/order-lifecycle.service';
import { OrderWithRelations } from '../orders/order.mapper';
import { OrdersService } from '../orders/orders.service';
import { FinikPaymentProvider } from './providers/finik.provider';
import {
  type PaymentEventStatus,
  PaymentProvider,
  VerifiedPaymentEvent,
} from './providers/payment-provider';
import { TestPaymentProvider } from './providers/test.provider';

type Tx = Prisma.TransactionClient;

export interface PaymentSession {
  id: string;
  provider: string;
  paymentUrl: string;
  amount: number;
  expiresAt: Date | null;
}

export type WebhookOutcome = 'processed' | 'duplicate' | 'ignored';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Record<string, PaymentProvider>;
  private readonly activeProvider: PaymentProvider;
  private readonly frontendUrl: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly access: AudioAccessService,
    private readonly cache: CacheService,
    private readonly events: DomainEventPublisher,
    private readonly testProvider: TestPaymentProvider,
    finikProvider: FinikPaymentProvider,
    config: ConfigService<Env, true>,
  ) {
    this.providers = { test: testProvider, finik: finikProvider };
    this.activeProvider = this.providers[config.get('PAYMENT_PROVIDER', { infer: true })];
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true }).replace(/\/+$/, '');
    this.isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  // ─── Создание платежа ──────────────────────────────────────────────────────

  async startForUser(user: AuthenticatedUser, orderNumber: string): Promise<PaymentSession> {
    return this.start(await this.orders.findOwn(user, orderNumber));
  }

  /**
   * Платёж у провайдера для неоплаченного онлайн-заказа. Если ожидающий платёж
   * уже есть — возвращается он же (повторное нажатие «Оплатить» не создаёт дублей).
   */
  async start(order: OrderWithRelations | Order): Promise<PaymentSession> {
    if (order.paymentMethod !== 'ONLINE') {
      throw new ConflictException('This order is paid on delivery');
    }
    if (order.status !== 'PENDING') {
      throw new ConflictException('Order is not awaiting payment');
    }
    if (order.expiresAt && order.expiresAt <= new Date()) {
      throw new ConflictException('Payment time for this order has expired');
    }

    const existing = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: 'PENDING', paymentUrl: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return this.session(existing, order);
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: this.activeProvider.name,
        amount: order.total,
        currency: order.currency,
        status: 'PENDING',
        paymentMethod: 'ONLINE',
      },
    });

    try {
      const created = await this.activeProvider.createPayment({
        paymentId: payment.id,
        orderNumber: order.orderNumber,
        amount: payment.amount,
        currency: payment.currency,
        returnUrl: `${this.frontendUrl}/orders/${order.orderNumber}?payment=${payment.id}`,
      });
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paymentUrl: created.paymentUrl, providerPaymentId: created.providerPaymentId },
      });
      return this.session(updated, order);
    } catch (error) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      throw error;
    }
  }

  private session(payment: Payment, order: Pick<Order, 'expiresAt'>): PaymentSession {
    return {
      id: payment.id,
      provider: payment.provider,
      paymentUrl: payment.paymentUrl!,
      amount: payment.amount,
      expiresAt: order.expiresAt,
    };
  }

  // ─── Уведомления провайдера ────────────────────────────────────────────────

  async handleWebhook(providerName: string, request: Request): Promise<WebhookOutcome> {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new NotFoundException('Unknown payment provider');
    }
    const event = await provider.parseWebhook(request);
    if (!event) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return this.processEvent(provider.name, event);
  }

  /**
   * Обработка проверенного уведомления в одной транзакции. Повтор того же события
   * (provider + externalEventId) ничего не меняет — ни второй оплаты, ни второй
   * выдачи доступа.
   */
  async processEvent(provider: string, event: VerifiedPaymentEvent): Promise<WebhookOutcome> {
    let salesChanged = false;
    const outbox = new DomainEventOutbox();
    try {
      const outcome = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findFirst({
          where: { id: isUuid(event.paymentId) ? event.paymentId : undefined, provider },
          include: { order: true },
        });

        await tx.paymentEvent.create({
          data: {
            provider,
            externalEventId: event.externalEventId,
            paymentId: payment?.id ?? null,
            eventType: event.eventType,
            payload: event.payload as Prisma.InputJsonValue,
            processedAt: new Date(),
          },
        });

        if (!payment) {
          this.logger.warn(
            `Payment event ${event.externalEventId} for unknown payment ${event.paymentId}`,
          );
          return 'ignored' as const;
        }

        salesChanged = await this.applyEvent(
          tx,
          payment,
          payment.order,
          event.status,
          event,
          outbox,
        );
        return 'processed' as const;
      });

      if (salesChanged) {
        await this.cache.invalidateCatalog();
      }
      await this.events.publish(outbox);
      return outcome;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('external_event_id')
      ) {
        return 'duplicate';
      }
      throw error;
    }
  }

  /** Возвращает true, если изменились продажи (для сброса кэша каталога). */
  private async applyEvent(
    tx: Tx,
    payment: Payment,
    order: Order,
    status: PaymentEventStatus,
    event: VerifiedPaymentEvent,
    outbox: DomainEventOutbox,
  ): Promise<boolean> {
    switch (status) {
      case 'SUCCEEDED':
        return this.applySuccess(tx, payment, order, event, outbox);

      case 'FAILED':
      case 'CANCELLED':
        // Заказ остаётся неоплаченным — можно попробовать оплатить снова
        await tx.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: status === 'FAILED' ? 'FAILED' : 'CANCELLED' },
        });
        return false;

      case 'REFUNDED':
        return this.applyRefund(tx, payment, order, outbox);
    }
  }

  private async applySuccess(
    tx: Tx,
    payment: Payment,
    order: Order,
    event: VerifiedPaymentEvent,
    outbox: DomainEventOutbox,
  ): Promise<boolean> {
    if (payment.status === 'SUCCEEDED') {
      return false;
    }
    if (event.amount !== payment.amount) {
      await this.flagForReview(
        tx,
        payment.id,
        `Amount mismatch: expected ${payment.amount}, received ${event.amount}`,
      );
      return false;
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCEEDED',
        paidAt: new Date(),
        providerPaymentId: event.providerPaymentId ?? payment.providerPaymentId,
      },
    });

    if (order.status !== 'PENDING') {
      await this.flagForReview(
        tx,
        payment.id,
        `Payment received for an order in status ${order.status}: refund required`,
      );
      return false;
    }

    await this.markPaid(tx, order, payment.provider, outbox);
    return true;
  }

  /**
   * Заказ оплачен: доступ к аудиокнигам, счётчики продаж, история.
   * Заказ только из аудиокниг сразу завершается — отправлять нечего.
   */
  private async markPaid(
    tx: Tx,
    order: Order,
    provider: string,
    outbox: DomainEventOutbox,
  ): Promise<void> {
    await this.lifecycle.transition(
      tx,
      order.id,
      'PAID',
      { comment: `Paid via ${provider}`, outbox },
      ['PENDING'],
    );

    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      if (item.productType === 'AUDIOBOOK' && item.audiobookId) {
        await this.access.grantForOrderItem(order.userId, item.audiobookId, item.id, tx);
        outbox.add({
          name: DomainEvents.AudioAccessGranted,
          payload: { userId: order.userId, audiobookId: item.audiobookId, source: 'order' },
        });
        await tx.audiobook.update({
          where: { id: item.audiobookId },
          data: { salesCount: { increment: 1 } },
        });
      }
      if (item.productType === 'BOOK' && item.bookId) {
        await tx.book.update({
          where: { id: item.bookId },
          data: { salesCount: { increment: item.quantity } },
        });
      }
    }

    if (items.every((item) => item.productType === 'AUDIOBOOK')) {
      await this.lifecycle.transition(
        tx,
        order.id,
        'COMPLETED',
        { comment: 'Digital order: access granted', outbox },
        ['PAID'],
      );
    }
  }

  /** Возврат: доступ к аудиокнигам отзывается, непереданные книги возвращаются на склад. */
  private async applyRefund(
    tx: Tx,
    payment: Payment,
    order: Order,
    outbox: DomainEventOutbox,
    options: { changedById?: string; comment?: string } = {},
  ): Promise<boolean> {
    if (payment.status === 'REFUNDED') {
      return false;
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED' || order.status === 'PENDING') {
      return false;
    }

    const stockStillHere = order.status === 'PAID' || order.status === 'PROCESSING';
    await this.lifecycle.transition(tx, order.id, 'REFUNDED', {
      changedById: options.changedById,
      comment: options.comment ?? 'Payment refunded',
      outbox,
    });

    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    await tx.audioAccess.updateMany({
      where: { orderItemId: { in: items.map((item) => item.id) }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    for (const item of items) {
      if (item.productType === 'BOOK' && item.bookId) {
        await tx.book.update({
          where: { id: item.bookId },
          data: {
            salesCount: { decrement: item.quantity },
            ...(stockStillHere && { stockQuantity: { increment: item.quantity } }),
          },
        });
      }
      if (item.productType === 'AUDIOBOOK' && item.audiobookId) {
        await tx.audiobook.update({
          where: { id: item.audiobookId },
          data: { salesCount: { decrement: 1 } },
        });
      }
    }
    return true;
  }

  private async flagForReview(tx: Tx, paymentId: string, reason: string): Promise<void> {
    await tx.payment.update({
      where: { id: paymentId },
      data: { requiresReview: true, reviewReason: reason },
    });
    this.logger.warn(`Payment ${paymentId} requires review: ${reason}`);
  }

  // ─── Администрирование ─────────────────────────────────────────────────────

  /**
   * Возврат, выполненный администратором у провайдера (в кабинете Finik) или наличными.
   * Заказ → REFUNDED, доступ к аудиокнигам отзывается, непереданные книги — на склад.
   */
  async refundByAdmin(orderId: string, actorId: string, comment?: string): Promise<void> {
    const outbox = new DomainEventOutbox();
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      const payment = await tx.payment.findFirst({
        where: { orderId, status: 'SUCCEEDED' },
        orderBy: { paidAt: 'desc' },
      });
      if (!payment || !['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'].includes(order.status)) {
        throw new ConflictException('Order has no received payment to refund');
      }
      await this.applyRefund(tx, payment, order, outbox, {
        changedById: actorId,
        comment: comment ?? 'Refunded by administrator',
      });
      await tx.payment.update({ where: { id: payment.id }, data: { requiresReview: false } });
    });
    await this.cache.invalidateCatalog();
    await this.events.publish(outbox);
  }

  /**
   * Оплата наличными при получении: записывается, когда администратор завершает заказ.
   * Учитывается в продажах и популярности. Вызывать внутри транзакции.
   */
  async recordCashPayment(tx: Tx, order: Order): Promise<void> {
    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: 'cash',
        paymentMethod: 'CASH',
        status: 'SUCCEEDED',
        amount: order.total,
        currency: order.currency,
        paidAt: new Date(),
      },
    });
    const items = await tx.orderItem.findMany({
      where: { orderId: order.id, productType: 'BOOK' },
    });
    for (const item of items) {
      if (item.bookId) {
        await tx.book.update({
          where: { id: item.bookId },
          data: { salesCount: { increment: item.quantity } },
        });
      }
    }
  }

  /** Платёж разобран вручную (например, деньги за отменённый заказ возвращены в кабинете провайдера). */
  async resolveReview(paymentId: string, refunded: boolean, note: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (!payment.requiresReview) {
      throw new ConflictException('Payment does not require review');
    }
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        requiresReview: false,
        reviewReason: `${payment.reviewReason ?? ''} | Resolved: ${note}`.trim(),
        ...(refunded && { status: 'REFUNDED' }),
      },
    });
  }

  // ─── Симуляция оплаты (только тестовый провайдер, не production) ───────────

  async simulate(user: AuthenticatedUser, paymentId: string, status: PaymentEventStatus) {
    if (this.isProduction || this.activeProvider.name !== 'test') {
      throw new ForbiddenException('Payment simulation is available only with the test provider');
    }
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, order: { userId: user.id } },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.processEvent('test', {
      externalEventId: `sim-${randomUUID()}`,
      paymentId: payment.id,
      status,
      amount: payment.amount,
      eventType: `payment.${status.toLowerCase()}`,
      payload: { simulated: true, status },
    });
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
