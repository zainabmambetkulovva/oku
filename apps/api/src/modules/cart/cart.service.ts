import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AudioAccessService } from '../listening/audio-access.service';
import { StorageService } from '../storage/storage.service';
import { AddCartItemDto, MAX_LINE_QUANTITY, MergeCartDto } from './dto/cart.dto';

export type CartIssue =
  /** Товар снят с продажи или удалён */
  | 'UNAVAILABLE'
  /** Книги нет на складе */
  | 'OUT_OF_STOCK'
  /** На складе меньше, чем в корзине */
  | 'INSUFFICIENT_STOCK'
  /** Аудиокнига уже куплена или доступна бесплатно */
  | 'ALREADY_OWNED';

const cartItemInclude = {
  book: true,
  audiobook: true,
} satisfies Prisma.CartItemInclude;

type CartItemWithProduct = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>;

/**
 * Корзина пользователя. Цены всегда текущие и считаются сервером;
 * у каждой позиции — список проблем, мешающих оформить заказ.
 */
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: AudioAccessService,
  ) {}

  async getCart(user: AuthenticatedUser) {
    const cart = await this.ensureCart(user.id);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: cartItemInclude,
      orderBy: { createdAt: 'asc' },
    });

    const lines = await Promise.all(items.map((item) => this.toLine(item, user)));
    const valid = lines.filter((line) => line.issues.length === 0);
    return {
      items: lines,
      itemsCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      /** Сумма позиций без проблем, тыйын */
      subtotal: valid.reduce((sum, line) => sum + line.lineTotal, 0),
      currency: 'KGS',
      hasIssues: lines.length !== valid.length,
      /** Есть печатные книги — при оформлении нужен способ доставки */
      requiresDelivery: lines.some((line) => line.product.type === 'BOOK'),
    };
  }

  async addItem(user: AuthenticatedUser, dto: AddCartItemDto) {
    const cart = await this.ensureCart(user.id);

    if (Boolean(dto.bookId) === Boolean(dto.audiobookId)) {
      throw new BadRequestException('Specify exactly one of bookId or audiobookId');
    }

    if (dto.bookId) {
      const book = await this.prisma.book.findFirst({
        where: { id: dto.bookId, status: 'ACTIVE', deletedAt: null },
      });
      if (!book) {
        throw new NotFoundException('Book not found');
      }
      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_bookId: { cartId: cart.id, bookId: book.id } },
      });
      const quantity = (existing?.quantity ?? 0) + (dto.quantity ?? 1);
      this.assertStock(quantity, book.stockQuantity);

      await this.prisma.cartItem.upsert({
        where: { cartId_bookId: { cartId: cart.id, bookId: book.id } },
        create: { cartId: cart.id, bookId: book.id, quantity },
        update: { quantity },
      });
    } else {
      if (dto.quantity !== undefined && dto.quantity !== 1) {
        throw new BadRequestException('An audiobook can be added only once');
      }
      const audiobook = await this.prisma.audiobook.findFirst({
        where: { id: dto.audiobookId, status: 'ACTIVE', deletedAt: null },
      });
      if (!audiobook) {
        throw new NotFoundException('Audiobook not found');
      }
      if (audiobook.price === 0) {
        throw new ConflictException('This audiobook is free: no purchase is needed');
      }
      if (await this.access.hasFullAccess(user, audiobook.id)) {
        throw new ConflictException('You already have access to this audiobook');
      }
      await this.prisma.cartItem.upsert({
        where: { cartId_audiobookId: { cartId: cart.id, audiobookId: audiobook.id } },
        create: { cartId: cart.id, audiobookId: audiobook.id, quantity: 1 },
        update: {},
      });
    }

    return this.getCart(user);
  }

  async updateQuantity(user: AuthenticatedUser, itemId: string, quantity: number) {
    const item = await this.findOwnItem(user.id, itemId);
    if (item.audiobookId) {
      throw new BadRequestException('Audiobook quantity is always 1');
    }
    if (!item.book || item.book.status !== 'ACTIVE') {
      throw new ConflictException('Book is no longer available');
    }
    this.assertStock(quantity, item.book.stockQuantity);

    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    return this.getCart(user);
  }

  async removeItem(user: AuthenticatedUser, itemId: string) {
    const item = await this.findOwnItem(user.id, itemId);
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return this.getCart(user);
  }

  async clear(user: AuthenticatedUser): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
  }

  /**
   * Добавляет позиции гостевой корзины. Неподходящие позиции пропускаются
   * и возвращаются в skipped с причиной.
   */
  async merge(user: AuthenticatedUser, dto: MergeCartDto) {
    const skipped: { item: AddCartItemDto; reason: string }[] = [];
    for (const item of dto.items) {
      try {
        await this.addItem(user, item);
      } catch (error) {
        if (!(error instanceof HttpException)) {
          throw error;
        }
        skipped.push({ item, reason: error.message });
      }
    }
    return { cart: await this.getCart(user), skipped };
  }

  private async toLine(item: CartItemWithProduct, user: AuthenticatedUser) {
    const issues: CartIssue[] = [];
    let product;

    if (item.book) {
      const book = item.book;
      if (book.status !== 'ACTIVE' || book.deletedAt) {
        issues.push('UNAVAILABLE');
      } else if (book.stockQuantity === 0) {
        issues.push('OUT_OF_STOCK');
      } else if (book.stockQuantity < item.quantity) {
        issues.push('INSUFFICIENT_STOCK');
      }
      product = {
        type: 'BOOK' as const,
        id: book.id,
        slug: book.slug,
        title: book.title,
        author: book.author,
        coverUrl: this.storage.publicUrl(book.coverKey),
        price: book.price,
        currency: book.currency,
        stockQuantity: book.stockQuantity,
      };
    } else {
      const audiobook = item.audiobook!;
      if (audiobook.status !== 'ACTIVE' || audiobook.deletedAt) {
        issues.push('UNAVAILABLE');
      } else if (audiobook.price === 0 || (await this.access.hasFullAccess(user, audiobook.id))) {
        issues.push('ALREADY_OWNED');
      }
      product = {
        type: 'AUDIOBOOK' as const,
        id: audiobook.id,
        slug: audiobook.slug,
        title: audiobook.title,
        author: audiobook.author,
        coverUrl: this.storage.publicUrl(audiobook.coverKey),
        price: audiobook.price,
        currency: audiobook.currency,
        stockQuantity: null,
      };
    }

    return {
      id: item.id,
      quantity: item.quantity,
      product,
      lineTotal: product.price * item.quantity,
      issues,
    };
  }

  private assertStock(quantity: number, stock: number): void {
    if (quantity > MAX_LINE_QUANTITY) {
      throw new BadRequestException(`No more than ${MAX_LINE_QUANTITY} copies per book`);
    }
    if (quantity > stock) {
      throw new ConflictException({
        message: stock === 0 ? 'Book is out of stock' : `Only ${stock} copies in stock`,
        details: { available: stock },
      });
    }
  }

  private async findOwnItem(userId: string, itemId: string): Promise<CartItemWithProduct> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: cartItemInclude,
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    return item;
  }

  private ensureCart(userId: string) {
    return this.prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
  }
}
