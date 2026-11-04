/**
 * Проверка ограничений базы данных на настоящей PostgreSQL с применёнными миграциями.
 * Каждое ограничение из docs/database-specification.md (раздел 15) должно
 * отклонять некорректные данные независимо от кода backend.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { createFactories, truncateAll, unique } from '../helpers/database';

const prisma = new PrismaClient();
const factory = createFactories(prisma);

/** Ожидает нарушение CHECK-ограничения с указанным именем. */
async function expectCheckViolation(promise: Promise<unknown>, constraint: string) {
  await expect(promise).rejects.toThrow(
    new RegExp(`violates check constraint \\\\?"${constraint}\\\\?"`),
  );
}

/** Ожидает ошибку Prisma с указанным кодом (P2002 — уникальность, P2003 — внешний ключ). */
async function expectPrismaError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({
    constructor: Prisma.PrismaClientKnownRequestError,
    code,
  });
}

beforeEach(() => truncateAll(prisma));
afterAll(() => prisma.$disconnect());

describe('books', () => {
  it('accepts a valid book', async () => {
    await expect(factory.book()).resolves.toMatchObject({ status: 'DRAFT', currency: 'KGS' });
  });

  it('requires a positive price', async () => {
    await expectCheckViolation(factory.book({ price: 0 }), 'books_price_positive_chk');
    await expectCheckViolation(factory.book({ price: -100 }), 'books_price_positive_chk');
  });

  it('forbids negative stock', async () => {
    await expectCheckViolation(
      factory.book({ stockQuantity: -1 }),
      'books_stock_quantity_non_negative_chk',
    );
  });

  it('cannot decrement stock below zero', async () => {
    const book = await factory.book({ stockQuantity: 1 });
    await expectCheckViolation(
      prisma.book.update({ where: { id: book.id }, data: { stockQuantity: { decrement: 2 } } }),
      'books_stock_quantity_non_negative_chk',
    );
  });

  it('keeps ISBN unique but allows many books without ISBN', async () => {
    await factory.book();
    await factory.book();
    await prisma.book.create({
      data: { title: 'A', author: 'A', price: 1, slug: unique('b'), isbn: '978-0' },
    });
    await expectPrismaError(
      prisma.book.create({
        data: { title: 'B', author: 'B', price: 1, slug: unique('b'), isbn: '978-0' },
      }),
      'P2002',
    );
  });

  it('finds books by part of the title (pg_trgm search)', async () => {
    await factory.book({ title: 'Джамиля' });
    await factory.book({ title: 'Белый пароход' });

    const found = await prisma.book.findMany({
      where: { title: { contains: 'амил', mode: 'insensitive' } },
    });
    expect(found.map((b) => b.title)).toEqual(['Джамиля']);
  });
});

describe('audiobooks and chapters', () => {
  it('allows a draft without duration but not a published one', async () => {
    const draft = await factory.audiobook();
    expect(draft.durationSeconds).toBe(0);

    await expectCheckViolation(
      prisma.audiobook.update({ where: { id: draft.id }, data: { status: 'ACTIVE' } }),
      'audiobooks_active_duration_positive_chk',
    );
    await expect(
      prisma.audiobook.update({
        where: { id: draft.id },
        data: { status: 'ACTIVE', durationSeconds: 600 },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  it('requires unique positive chapter numbers and positive duration', async () => {
    const audiobook = await factory.audiobook();
    const chapter = (chapterNumber: number, durationSeconds = 60) =>
      prisma.audioChapter.create({
        data: {
          audiobookId: audiobook.id,
          title: `Chapter ${chapterNumber}`,
          chapterNumber,
          durationSeconds,
          storageKey: unique('key'),
        },
      });

    await chapter(1);
    await expectPrismaError(chapter(1), 'P2002');
    await expectCheckViolation(chapter(0), 'audio_chapters_chapter_number_positive_chk');
    await expectCheckViolation(chapter(2, 0), 'audio_chapters_duration_positive_chk');
  });

  it('deletes chapters together with the audiobook', async () => {
    const audiobook = await factory.audiobook();
    await prisma.audioChapter.create({
      data: {
        audiobookId: audiobook.id,
        title: 'Chapter 1',
        chapterNumber: 1,
        durationSeconds: 60,
        storageKey: 'k',
      },
    });

    await prisma.audiobook.delete({ where: { id: audiobook.id } });
    await expect(prisma.audioChapter.count()).resolves.toBe(0);
  });
});

describe('categories', () => {
  it('cannot delete a category that has subcategories', async () => {
    const parent = await prisma.category.create({ data: { name: 'Parent', slug: unique('c') } });
    await prisma.category.create({
      data: { name: 'Child', slug: unique('c'), parentId: parent.id },
    });

    await expectPrismaError(prisma.category.delete({ where: { id: parent.id } }), 'P2003');
  });

  it('cannot be its own parent', async () => {
    const category = await prisma.category.create({ data: { name: 'C', slug: unique('c') } });
    await expectCheckViolation(
      prisma.category.update({ where: { id: category.id }, data: { parentId: category.id } }),
      'categories_not_self_parent_chk',
    );
  });
});

describe('cart items', () => {
  const setup = async () => {
    const user = await factory.user();
    const cart = await prisma.cart.create({ data: { userId: user.id } });
    return { user, cart, book: await factory.book(), audiobook: await factory.audiobook() };
  };

  it('must reference exactly one product', async () => {
    const { cart, book, audiobook } = await setup();

    await expectCheckViolation(
      prisma.cartItem.create({ data: { cartId: cart.id } }),
      'cart_items_one_product_chk',
    );
    await expectCheckViolation(
      prisma.cartItem.create({
        data: { cartId: cart.id, bookId: book.id, audiobookId: audiobook.id },
      }),
      'cart_items_one_product_chk',
    );
  });

  it('requires positive quantity and exactly one copy of an audiobook', async () => {
    const { cart, book, audiobook } = await setup();

    await expectCheckViolation(
      prisma.cartItem.create({ data: { cartId: cart.id, bookId: book.id, quantity: 0 } }),
      'cart_items_quantity_positive_chk',
    );
    await expectCheckViolation(
      prisma.cartItem.create({
        data: { cartId: cart.id, audiobookId: audiobook.id, quantity: 2 },
      }),
      'cart_items_audiobook_quantity_chk',
    );
  });

  it('does not allow the same product twice in one cart', async () => {
    const { cart, book } = await setup();

    await prisma.cartItem.create({ data: { cartId: cart.id, bookId: book.id, quantity: 2 } });
    await expectPrismaError(
      prisma.cartItem.create({ data: { cartId: cart.id, bookId: book.id } }),
      'P2002',
    );
  });

  it('allows only one cart per user', async () => {
    const { user } = await setup();
    await expectPrismaError(prisma.cart.create({ data: { userId: user.id } }), 'P2002');
  });
});

describe('orders and order items', () => {
  it('requires total = subtotal + delivery - discount', async () => {
    const user = await factory.user();

    await expect(
      prisma.order.create({
        data: {
          userId: user.id,
          orderNumber: unique('ORD'),
          subtotal: 1000,
          deliveryPrice: 300,
          discount: 100,
          total: 1200,
          recipientName: 'R',
          recipientPhone: 'P',
        },
      }),
    ).resolves.toBeDefined();

    await expectCheckViolation(
      factory.order(user.id, { subtotal: 1000, total: 999 }),
      'orders_total_consistent_chk',
    );
  });

  it('keeps order numbers unique', async () => {
    const user = await factory.user();
    const order = await factory.order(user.id);
    await expectPrismaError(
      prisma.order.create({
        data: {
          userId: user.id,
          orderNumber: order.orderNumber,
          subtotal: 1,
          total: 1,
          recipientName: 'R',
          recipientPhone: 'P',
        },
      }),
      'P2002',
    );
  });

  it('validates order items', async () => {
    const user = await factory.user();
    const order = await factory.order(user.id);
    const book = await factory.book();
    const audiobook = await factory.audiobook();
    const item = (data: Partial<Prisma.OrderItemUncheckedCreateInput>) =>
      prisma.orderItem.create({
        data: {
          orderId: order.id,
          productType: 'BOOK',
          bookId: book.id,
          productTitle: 'T',
          productAuthor: 'A',
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
          ...data,
        },
      });

    await expect(item({})).resolves.toBeDefined();
    await expectCheckViolation(item({ productType: 'AUDIOBOOK' }), 'order_items_product_type_chk');
    await expectCheckViolation(item({ audiobookId: audiobook.id }), 'order_items_product_type_chk');
    await expectCheckViolation(
      item({ quantity: 2, totalPrice: 999 }),
      'order_items_total_price_consistent_chk',
    );
    await expectCheckViolation(
      item({ quantity: 0, totalPrice: 0 }),
      'order_items_quantity_positive_chk',
    );
    await expectCheckViolation(
      item({
        productType: 'AUDIOBOOK',
        bookId: null,
        audiobookId: audiobook.id,
        quantity: 2,
        totalPrice: 1000,
      }),
      'order_items_audiobook_quantity_chk',
    );
  });

  it('keeps the order item snapshot when the product is deleted', async () => {
    const user = await factory.user();
    const order = await factory.order(user.id);
    const book = await factory.book({ title: 'Removed book' });
    const item = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productType: 'BOOK',
        bookId: book.id,
        productTitle: book.title,
        productAuthor: book.author,
        quantity: 1,
        unitPrice: book.price,
        totalPrice: book.price,
      },
    });

    await prisma.book.delete({ where: { id: book.id } });

    await expect(
      prisma.orderItem.findUniqueOrThrow({ where: { id: item.id } }),
    ).resolves.toMatchObject({
      bookId: null,
      productType: 'BOOK',
      productTitle: 'Removed book',
      unitPrice: book.price,
    });
  });

  it('cannot delete an order that has items', async () => {
    const user = await factory.user();
    const order = await factory.order(user.id);
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productType: 'BOOK',
        productTitle: 'T',
        productAuthor: 'A',
        quantity: 1,
        unitPrice: 1,
        totalPrice: 1,
      },
    });

    await expectPrismaError(prisma.order.delete({ where: { id: order.id } }), 'P2003');
  });
});

describe('users', () => {
  it('keeps e-mail unique', async () => {
    const user = await factory.user();
    await expectPrismaError(prisma.user.create({ data: { email: user.email } }), 'P2002');
  });

  it('cannot delete a user with orders (financial history)', async () => {
    const user = await factory.user();
    await factory.order(user.id);

    await expectPrismaError(prisma.user.delete({ where: { id: user.id } }), 'P2003');
  });

  it('removes personal data together with the user', async () => {
    const user = await factory.user();
    const book = await factory.book();
    await prisma.session.create({
      data: { userId: user.id, tokenHash: unique('hash'), expiresAt: new Date() },
    });
    await prisma.cart.create({
      data: { userId: user.id, items: { create: { bookId: book.id } } },
    });
    await prisma.favorite.create({ data: { userId: user.id, bookId: book.id } });

    await prisma.user.delete({ where: { id: user.id } });

    await expect(prisma.session.count()).resolves.toBe(0);
    await expect(prisma.cart.count()).resolves.toBe(0);
    await expect(prisma.cartItem.count()).resolves.toBe(0);
    await expect(prisma.favorite.count()).resolves.toBe(0);
    await expect(prisma.book.count()).resolves.toBe(1);
  });

  it('keeps session token hashes unique', async () => {
    const user = await factory.user();
    const tokenHash = unique('hash');
    await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt: new Date() } });
    await expectPrismaError(
      prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt: new Date() } }),
      'P2002',
    );
  });
});

describe('favorites and reviews', () => {
  it('favorites: one product, no duplicates', async () => {
    const user = await factory.user();
    const book = await factory.book();

    await expectCheckViolation(
      prisma.favorite.create({ data: { userId: user.id } }),
      'favorites_one_product_chk',
    );
    await prisma.favorite.create({ data: { userId: user.id, bookId: book.id } });
    await expectPrismaError(
      prisma.favorite.create({ data: { userId: user.id, bookId: book.id } }),
      'P2002',
    );
  });

  it('reviews: rating 1–5, one review per user and product', async () => {
    const user = await factory.user();
    const book = await factory.book();
    const review = (rating: number) =>
      prisma.review.create({ data: { userId: user.id, bookId: book.id, rating } });

    await expectCheckViolation(review(0), 'reviews_rating_range_chk');
    await expectCheckViolation(review(6), 'reviews_rating_range_chk');
    await expect(review(5)).resolves.toMatchObject({ status: 'PENDING' });
    await expectPrismaError(review(4), 'P2002');
  });
});

describe('payments', () => {
  it('requires a positive amount', async () => {
    const user = await factory.user();
    const order = await factory.order(user.id);

    await expectCheckViolation(
      prisma.payment.create({ data: { orderId: order.id, provider: 'test', amount: 0 } }),
      'payments_amount_positive_chk',
    );
  });

  it('does not store the same provider event twice (idempotency)', async () => {
    const event = { provider: 'test', externalEventId: 'evt_1', eventType: 'payment.succeeded' };

    await prisma.paymentEvent.create({ data: event });
    await expectPrismaError(prisma.paymentEvent.create({ data: event }), 'P2002');
    await expect(
      prisma.paymentEvent.create({ data: { ...event, provider: 'other' } }),
    ).resolves.toBeDefined();
  });

  it('keeps provider payment ids unique per provider', async () => {
    const user = await factory.user();
    const order = await factory.order(user.id);
    const payment = { orderId: order.id, provider: 'test', providerPaymentId: 'pay_1', amount: 1 };

    await prisma.payment.create({ data: payment });
    await expectPrismaError(prisma.payment.create({ data: payment }), 'P2002');
  });
});

describe('audio access and listening progress', () => {
  it('grants access to an audiobook only once per user', async () => {
    const user = await factory.user();
    const audiobook = await factory.audiobook();

    await prisma.audioAccess.create({ data: { userId: user.id, audiobookId: audiobook.id } });
    await expectPrismaError(
      prisma.audioAccess.create({ data: { userId: user.id, audiobookId: audiobook.id } }),
      'P2002',
    );
  });

  it('cannot delete an audiobook that somebody has access to', async () => {
    const user = await factory.user();
    const audiobook = await factory.audiobook();
    await prisma.audioAccess.create({ data: { userId: user.id, audiobookId: audiobook.id } });

    await expectPrismaError(prisma.audiobook.delete({ where: { id: audiobook.id } }), 'P2003');
  });

  it('forbids a negative listening position', async () => {
    const user = await factory.user();
    const audiobook = await factory.audiobook();

    await expectCheckViolation(
      prisma.listeningProgress.create({
        data: { userId: user.id, audiobookId: audiobook.id, positionSeconds: -1 },
      }),
      'listening_progress_position_non_negative_chk',
    );
  });
});
