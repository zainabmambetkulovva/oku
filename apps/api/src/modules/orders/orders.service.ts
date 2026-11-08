import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryMethod, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainEventOutbox, DomainEventPublisher } from '../../common/events/domain-event-outbox';
import { DomainEvents } from '../../common/events/domain-events';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AudioAccessService } from '../listening/audio-access.service';
import { StorageService } from '../storage/storage.service';
import { DeliveryService } from './delivery.service';
import { CheckoutDto, DeliveryAddressDto, OrdersQueryDto } from './dto/checkout.dto';
import { OrderLifecycleService } from './order-lifecycle.service';
import { orderInclude, OrderWithRelations, toOrderResponse } from './order.mapper';
import { generateOrderNumber } from './order-number';

const ORDER_NUMBER_ATTEMPTS = 5;

interface CheckoutLine {
  cartItemId: string;
  productType: 'BOOK' | 'AUDIOBOOK';
  bookId: string | null;
  audiobookId: string | null;
  title: string;
  author: string;
  coverKey: string | null;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class OrdersService {
  private readonly paymentTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly delivery: DeliveryService,
    private readonly access: AudioAccessService,
    private readonly storage: StorageService,
    private readonly cache: CacheService,
    private readonly events: DomainEventPublisher,
    config: ConfigService<Env, true>,
  ) {
    this.paymentTtlMs = config.get('ORDER_PAYMENT_TTL_MINUTES', { infer: true }) * 60 * 1000;
  }

  // ─── Оформление ────────────────────────────────────────────────────────────

  /**
   * Заказ из корзины. Цены — текущие, считает сервер. Остаток книг списывается
   * атомарно (условие «остаток ≥ количества» в самом UPDATE), поэтому один
   * экземпляр нельзя продать двоим. Корзина очищается в той же транзакции.
   */
  async checkout(user: AuthenticatedUser, dto: CheckoutDto): Promise<OrderWithRelations> {
    const lines = await this.validatedLines(user);
    const hasBooks = lines.some((line) => line.productType === 'BOOK');
    const hasAudiobooks = lines.some((line) => line.productType === 'AUDIOBOOK');

    if (dto.paymentMethod === 'CASH' && hasAudiobooks) {
      throw new BadRequestException('Audiobooks can only be paid online');
    }

    let deliveryMethod: DeliveryMethod | null = null;
    let deliveryAddress: string | null = null;
    if (hasBooks) {
      deliveryMethod = this.delivery.assertMethod(dto.deliveryMethod);
      if (this.delivery.requiresAddress(deliveryMethod)) {
        deliveryAddress = await this.resolveAddress(user.id, dto);
      }
    } else if (dto.deliveryMethod) {
      throw new BadRequestException('Audiobooks do not need delivery');
    }

    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const deliveryPrice = deliveryMethod ? this.delivery.price(deliveryMethod) : 0;
    const total = subtotal + deliveryPrice;
    if (dto.expectedTotal !== undefined && dto.expectedTotal !== total) {
      throw new ConflictException({
        message: 'Prices have changed, please review the order',
        details: { expectedTotal: dto.expectedTotal, total },
      });
    }

    const order = await this.createWithUniqueNumber((orderNumber) =>
      this.prisma.$transaction(async (tx) => {
        for (const line of lines.filter((item) => item.productType === 'BOOK')) {
          const { count } = await tx.book.updateMany({
            where: {
              id: line.bookId!,
              status: 'ACTIVE',
              stockQuantity: { gte: line.quantity },
            },
            data: { stockQuantity: { decrement: line.quantity } },
          });
          if (count === 0) {
            throw new ConflictException({
              message: `Not enough copies of "${line.title}" in stock`,
              details: { bookId: line.bookId },
            });
          }
        }

        const created = await tx.order.create({
          data: {
            userId: user.id,
            orderNumber,
            status: 'PENDING',
            subtotal,
            deliveryPrice,
            discount: 0,
            total,
            currency: 'KGS',
            recipientName: dto.recipientName,
            recipientPhone: dto.recipientPhone,
            deliveryMethod,
            deliveryAddress,
            paymentMethod: dto.paymentMethod,
            comment: dto.comment,
            expiresAt:
              dto.paymentMethod === 'ONLINE' ? new Date(Date.now() + this.paymentTtlMs) : null,
            items: {
              create: lines.map((line) => ({
                productType: line.productType,
                bookId: line.bookId,
                audiobookId: line.audiobookId,
                productTitle: line.title,
                productAuthor: line.author,
                productCoverKey: line.coverKey,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                totalPrice: line.unitPrice * line.quantity,
              })),
            },
            statusHistory: {
              create: { oldStatus: null, newStatus: 'PENDING', changedById: user.id },
            },
          },
        });

        await tx.cartItem.deleteMany({
          where: { id: { in: lines.map((line) => line.cartItemId) } },
        });

        return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: orderInclude });
      }),
    );

    if (hasBooks) {
      // Остатки книг в каталоге изменились
      await this.cache.invalidateCatalog();
    }
    await this.events.publish([
      { name: DomainEvents.OrderCreated, payload: { orderId: order.id } },
    ]);
    return order;
  }

  /** Позиции корзины с текущими ценами. Любая проблема — 409 со списком. */
  private async validatedLines(user: AuthenticatedUser): Promise<CheckoutLine[]> {
    const items = await this.prisma.cartItem.findMany({
      where: { cart: { userId: user.id } },
      include: { book: true, audiobook: true },
      orderBy: { createdAt: 'asc' },
    });
    if (items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const problems: { cartItemId: string; issue: string }[] = [];
    const lines: CheckoutLine[] = [];

    for (const item of items) {
      if (item.book) {
        const { book } = item;
        if (book.status !== 'ACTIVE' || book.deletedAt) {
          problems.push({ cartItemId: item.id, issue: 'UNAVAILABLE' });
          continue;
        }
        if (book.stockQuantity < item.quantity) {
          problems.push({ cartItemId: item.id, issue: 'INSUFFICIENT_STOCK' });
          continue;
        }
        lines.push({
          cartItemId: item.id,
          productType: 'BOOK',
          bookId: book.id,
          audiobookId: null,
          title: book.title,
          author: book.author,
          coverKey: book.coverKey,
          quantity: item.quantity,
          unitPrice: book.price,
        });
      } else if (item.audiobook) {
        const { audiobook } = item;
        if (audiobook.status !== 'ACTIVE' || audiobook.deletedAt) {
          problems.push({ cartItemId: item.id, issue: 'UNAVAILABLE' });
          continue;
        }
        if (audiobook.price === 0 || (await this.access.hasFullAccess(user, audiobook.id))) {
          problems.push({ cartItemId: item.id, issue: 'ALREADY_OWNED' });
          continue;
        }
        lines.push({
          cartItemId: item.id,
          productType: 'AUDIOBOOK',
          bookId: null,
          audiobookId: audiobook.id,
          title: audiobook.title,
          author: audiobook.author,
          coverKey: audiobook.coverKey,
          quantity: 1,
          unitPrice: audiobook.price,
        });
      }
    }

    if (problems.length > 0) {
      throw new ConflictException({
        message: 'Some cart items cannot be ordered, please review the cart',
        details: problems,
      });
    }
    return lines;
  }

  /** Адрес — снимок строкой: изменение адреса в профиле не меняет старые заказы. */
  private async resolveAddress(userId: string, dto: CheckoutDto): Promise<string> {
    let address:
      | (Omit<DeliveryAddressDto, 'apartment' | 'postalCode'> & {
          apartment?: string | null;
          postalCode?: string | null;
        })
      | undefined = dto.address;
    if (dto.addressId) {
      const saved = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId } });
      if (!saved) {
        throw new NotFoundException('Address not found');
      }
      address = saved;
    }
    if (!address) {
      throw new BadRequestException('Delivery address is required for courier and post delivery');
    }

    return [
      address.country,
      address.city,
      `${address.street} ${address.building}`,
      address.apartment && `кв. ${address.apartment}`,
      address.postalCode,
    ]
      .filter(Boolean)
      .join(', ');
  }

  private async createWithUniqueNumber<T>(create: (orderNumber: string) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await create(generateOrderNumber());
      } catch (error) {
        const duplicateNumber =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          (error.meta?.target as string[] | undefined)?.includes('order_number');
        if (!duplicateNumber || attempt >= ORDER_NUMBER_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  // ─── Заказы покупателя ─────────────────────────────────────────────────────

  async list(user: AuthenticatedUser, query: OrdersQueryDto) {
    const where: Prisma.OrderWhereInput = {
      userId: user.id,
      ...(query.status && { status: query.status }),
    };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginated(
      orders.map((order) => toOrderResponse(order, this.storage)),
      total,
      query,
    );
  }

  /** Только свой заказ: чужой выглядит как несуществующий (404). */
  async findOwn(user: AuthenticatedUser, orderNumber: string): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, userId: user.id },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  /** Покупатель может отменить только неоплаченный заказ. */
  async cancelByUser(user: AuthenticatedUser, orderNumber: string): Promise<OrderWithRelations> {
    const order = await this.findOwn(user, orderNumber);
    if (order.status !== 'PENDING') {
      throw new ConflictException('Only unpaid orders can be cancelled');
    }

    const outbox = new DomainEventOutbox();
    await this.prisma.$transaction((tx) =>
      this.lifecycle.cancel(
        tx,
        order.id,
        { changedById: user.id, comment: 'Cancelled by customer', outbox },
        ['PENDING'],
      ),
    );
    await this.cache.invalidateCatalog();
    await this.events.publish(outbox);
    return this.findOwn(user, orderNumber);
  }

  toResponse(order: OrderWithRelations) {
    return toOrderResponse(order, this.storage);
  }
}
