import { randomUUID } from 'crypto';
import { OrderLifecycleService } from '../../src/modules/orders/order-lifecycle.service';
import {
  signTestWebhook,
  TEST_SIGNATURE_HEADER,
  TestWebhookBody,
} from '../../src/modules/payments/providers/test.provider';
import {
  bearer,
  createTestApp,
  registerUser,
  RegisteredUser,
  resetState,
  TestApp,
} from '../helpers/app';

describe('Cart, orders and payments (e2e)', () => {
  let t: TestApp;
  let user: RegisteredUser;
  let book: { id: string; price: number };
  let audiobook: { id: string; slug: string; paidChapterId: string };

  const api = (path: string) => `/api/v1${path}`;
  const as = (u: RegisteredUser) => ({
    get: (path: string) => t.http().get(api(path)).set(bearer(u.accessToken)),
    post: (path: string, body?: object) =>
      t.http().post(api(path)).set(bearer(u.accessToken)).send(body),
    patch: (path: string, body?: object) =>
      t.http().patch(api(path)).set(bearer(u.accessToken)).send(body),
    delete: (path: string) => t.http().delete(api(path)).set(bearer(u.accessToken)),
  });

  const createBook = (data: { title?: string; price?: number; stockQuantity?: number } = {}) =>
    t.prisma.book.create({
      data: {
        title: data.title ?? 'Джамиля',
        author: 'Чингиз Айтматов',
        slug: `book-${randomUUID()}`,
        price: data.price ?? 65_000,
        stockQuantity: data.stockQuantity ?? 5,
        status: 'ACTIVE',
      },
    });

  const courier = {
    recipientName: 'Айгерим Токтогулова',
    recipientPhone: '+996 700 123 456',
    deliveryMethod: 'COURIER',
    address: {
      country: 'Кыргызстан',
      city: 'Бишкек',
      street: 'пр. Чуй',
      building: '100',
      apartment: '5',
    },
    paymentMethod: 'ONLINE',
  };
  const digital = {
    recipientName: 'Айгерим',
    recipientPhone: '+996 700 123 456',
    paymentMethod: 'ONLINE',
  };

  const webhook = (
    body: TestWebhookBody,
    signature = signTestWebhook(body, 'test-payment-secret'),
  ) =>
    t.http().post(api('/payments/webhooks/test')).set(TEST_SIGNATURE_HEADER, signature).send(body);

  const pay = (
    paymentId: string,
    amount: number,
    status: TestWebhookBody['status'] = 'SUCCEEDED',
  ) => webhook({ eventId: randomUUID(), paymentId, amount, status, transactionId: randomUUID() });

  async function orderBook(u: RegisteredUser, quantity = 1, body: object = courier) {
    await as(u).post('/cart/items', { bookId: book.id, quantity }).expect(201);
    return (await as(u).post('/orders', body).expect(201)).body.data;
  }

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetState(t);
    user = await registerUser(t);
    book = await createBook();
    const created = await t.prisma.audiobook.create({
      data: {
        title: 'Джамиля (аудио)',
        author: 'Чингиз Айтматов',
        slug: `audio-${randomUUID()}`,
        price: 45_000,
        durationSeconds: 1200,
        status: 'ACTIVE',
        audioChapters: {
          create: [
            {
              chapterNumber: 1,
              title: 'Глава 1',
              durationSeconds: 600,
              storageKey: 'audiobooks/chapters/t/1.mp3',
              isFreePreview: true,
            },
            {
              chapterNumber: 2,
              title: 'Глава 2',
              durationSeconds: 600,
              storageKey: 'audiobooks/chapters/t/2.mp3',
            },
          ],
        },
      },
      include: { audioChapters: true },
    });
    audiobook = {
      id: created.id,
      slug: created.slug,
      paidChapterId: created.audioChapters.find((c) => !c.isFreePreview)!.id,
    };
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('cart', () => {
    it('adds books, accumulates quantity and calculates the subtotal on the server', async () => {
      await as(user).post('/cart/items', { bookId: book.id, quantity: 2 }).expect(201);
      const response = await as(user).post('/cart/items', { bookId: book.id }).expect(201);

      expect(response.body.data).toMatchObject({
        itemsCount: 3,
        subtotal: 195_000,
        currency: 'KGS',
        hasIssues: false,
        requiresDelivery: true,
        items: [
          expect.objectContaining({
            quantity: 3,
            lineTotal: 195_000,
            issues: [],
            product: expect.objectContaining({ type: 'BOOK', price: 65_000, stockQuantity: 5 }),
          }),
        ],
      });
    });

    it('does not allow more copies than in stock', async () => {
      const response = await as(user)
        .post('/cart/items', { bookId: book.id, quantity: 6 })
        .expect(409);
      expect(response.body.details).toEqual({ available: 5 });
    });

    it('adds an audiobook once and rejects owned, free or extra copies', async () => {
      await as(user).post('/cart/items', { audiobookId: audiobook.id }).expect(201);
      const again = await as(user).post('/cart/items', { audiobookId: audiobook.id }).expect(201);
      expect(again.body.data.items).toHaveLength(1);

      await as(user).post('/cart/items', { audiobookId: audiobook.id, quantity: 2 }).expect(400);
      await as(user)
        .post('/cart/items', { bookId: book.id, audiobookId: audiobook.id })
        .expect(400);
      await as(user).post('/cart/items', {}).expect(400);

      const free = await t.prisma.audiobook.create({
        data: {
          title: 'Free',
          author: 'A',
          slug: `free-${randomUUID()}`,
          price: 0,
          status: 'DRAFT',
        },
      });
      await as(user).post('/cart/items', { audiobookId: free.id }).expect(404);
      await t.prisma.audiobook.update({
        where: { id: free.id },
        data: { status: 'ACTIVE', durationSeconds: 1 },
      });
      await as(user).post('/cart/items', { audiobookId: free.id }).expect(409);

      const owner = await registerUser(t);
      await t.prisma.audioAccess.create({ data: { userId: owner.id, audiobookId: audiobook.id } });
      await as(owner).post('/cart/items', { audiobookId: audiobook.id }).expect(409);
    });

    it('marks items that can no longer be ordered', async () => {
      await as(user).post('/cart/items', { bookId: book.id, quantity: 3 }).expect(201);
      const other = await createBook({ title: 'Другая' });
      await as(user).post('/cart/items', { bookId: other.id }).expect(201);

      await t.prisma.book.update({ where: { id: book.id }, data: { stockQuantity: 2 } });
      await t.prisma.book.update({ where: { id: other.id }, data: { status: 'ARCHIVED' } });

      const cart = (await as(user).get('/cart').expect(200)).body.data;
      expect(cart.hasIssues).toBe(true);
      expect(cart.subtotal).toBe(0);
      expect(cart.items.map((item: { issues: string[] }) => item.issues)).toEqual([
        ['INSUFFICIENT_STOCK'],
        ['UNAVAILABLE'],
      ]);
    });

    it('updates, removes and clears items; other users cannot touch them', async () => {
      const added = (await as(user).post('/cart/items', { bookId: book.id }).expect(201)).body.data;
      const itemId = added.items[0].id;

      await as(user).patch(`/cart/items/${itemId}`, { quantity: 4 }).expect(200);
      await as(user).patch(`/cart/items/${itemId}`, { quantity: 6 }).expect(409);

      const stranger = await registerUser(t);
      await as(stranger).patch(`/cart/items/${itemId}`, { quantity: 1 }).expect(404);
      await as(stranger).delete(`/cart/items/${itemId}`).expect(404);

      const removed = await as(user).delete(`/cart/items/${itemId}`).expect(200);
      expect(removed.body.data.items).toEqual([]);

      await as(user).post('/cart/items', { bookId: book.id }).expect(201);
      await as(user).delete('/cart').expect(204);
      expect((await as(user).get('/cart')).body.data.items).toEqual([]);
    });

    it('merges a guest cart and reports skipped items', async () => {
      const response = await as(user)
        .post('/cart/merge', {
          items: [
            { bookId: book.id, quantity: 2 },
            { audiobookId: audiobook.id },
            { bookId: randomUUID() },
          ],
        })
        .expect(200);

      expect(response.body.data.cart.itemsCount).toBe(3);
      expect(response.body.data.skipped).toEqual([
        expect.objectContaining({ reason: 'Book not found' }),
      ]);
    });

    it('does not double books on a repeated merge and caps them by stock', async () => {
      await as(user).post('/cart/items', { bookId: book.id, quantity: 2 }).expect(201);

      // Та же гостевая корзина ещё раз (например, вход в двух вкладках) — без удвоения
      const again = await as(user)
        .post('/cart/merge', { items: [{ bookId: book.id, quantity: 2 }] })
        .expect(200);
      expect(again.body.data.cart.items[0].quantity).toBe(2);

      // Гость положил больше, чем есть на складе (5) — берём весь остаток, а не пропускаем
      const capped = await as(user)
        .post('/cart/merge', { items: [{ bookId: book.id, quantity: 9 }] })
        .expect(200);
      expect(capped.body.data.cart.items[0].quantity).toBe(5);
      expect(capped.body.data.skipped).toEqual([]);

      const soldOut = await createBook({ title: 'Распродано', stockQuantity: 0 });
      const result = await as(user)
        .post('/cart/merge', { items: [{ bookId: soldOut.id, quantity: 1 }] })
        .expect(200);
      expect(result.body.data.skipped).toEqual([
        expect.objectContaining({ reason: 'Book is out of stock' }),
      ]);
    });

    it('requires authentication', async () => {
      await t.http().get(api('/cart')).expect(401);
    });
  });

  describe('checkout', () => {
    it('creates an order with courier delivery, reserves stock and empties the cart', async () => {
      const { order, payment } = await orderBook(user, 2);

      expect(order).toMatchObject({
        orderNumber: expect.stringMatching(/^OKU-\d{6}-[A-Z0-9]{5}$/),
        status: 'PENDING',
        subtotal: 130_000,
        deliveryPrice: 20_000,
        total: 150_000,
        currency: 'KGS',
        deliveryMethod: 'COURIER',
        deliveryAddress: 'Кыргызстан, Бишкек, пр. Чуй 100, кв. 5',
        paymentMethod: 'ONLINE',
        items: [
          expect.objectContaining({
            productType: 'BOOK',
            quantity: 2,
            unitPrice: 65_000,
            totalPrice: 130_000,
          }),
        ],
        statusHistory: [expect.objectContaining({ oldStatus: null, newStatus: 'PENDING' })],
      });
      const minutesLeft = (new Date(order.expiresAt).getTime() - Date.now()) / 60_000;
      expect(minutesLeft).toBeGreaterThan(9);
      expect(minutesLeft).toBeLessThanOrEqual(10);

      expect(payment).toMatchObject({
        provider: 'test',
        amount: 150_000,
        paymentUrl: expect.stringContaining('/checkout/test-payment?paymentId='),
      });

      await expect(
        t.prisma.book.findUniqueOrThrow({ where: { id: book.id } }),
      ).resolves.toMatchObject({
        stockQuantity: 3,
      });
      expect((await as(user).get('/cart')).body.data.items).toEqual([]);
    });

    it('supports pickup without an address and saved addresses', async () => {
      const pickup = await orderBook(user, 1, {
        ...courier,
        deliveryMethod: 'PICKUP',
        address: undefined,
      });
      expect(pickup.order).toMatchObject({
        deliveryPrice: 0,
        deliveryAddress: null,
        total: 65_000,
      });

      const saved = (
        await as(user)
          .post('/users/me/addresses', {
            title: 'Дом',
            recipientName: 'А',
            phone: '+996700000000',
            country: 'Кыргызстан',
            city: 'Ош',
            street: 'Ленина',
            building: '1',
          })
          .expect(201)
      ).body.data;
      const post = await orderBook(user, 1, {
        ...courier,
        deliveryMethod: 'POST',
        address: undefined,
        addressId: saved.id,
      });
      expect(post.order).toMatchObject({
        deliveryPrice: 30_000,
        deliveryAddress: 'Кыргызстан, Ош, Ленина 1',
      });
    });

    it('validates delivery', async () => {
      await as(user).post('/cart/items', { bookId: book.id }).expect(201);

      await as(user)
        .post('/orders', { ...courier, address: undefined })
        .expect(400);
      await as(user)
        .post('/orders', { ...courier, deliveryMethod: undefined })
        .expect(400);

      const stranger = await registerUser(t);
      const foreign = (
        await as(stranger)
          .post('/users/me/addresses', {
            title: 'X',
            recipientName: 'X',
            phone: '+996700000000',
            country: 'K',
            city: 'B',
            street: 'S',
            building: '1',
          })
          .expect(201)
      ).body.data;
      await as(user)
        .post('/orders', { ...courier, address: undefined, addressId: foreign.id })
        .expect(404);

      expect(await t.prisma.order.count()).toBe(0);
    });

    it('orders audiobooks without delivery and only with online payment', async () => {
      await as(user).post('/cart/items', { audiobookId: audiobook.id }).expect(201);

      await as(user)
        .post('/orders', { ...digital, deliveryMethod: 'COURIER' })
        .expect(400);
      await as(user)
        .post('/orders', { ...digital, paymentMethod: 'CASH' })
        .expect(400);

      const { order } = (await as(user).post('/orders', digital).expect(201)).body.data;
      expect(order).toMatchObject({ deliveryMethod: null, deliveryPrice: 0, total: 45_000 });
    });

    it('accepts cash on delivery for printed books without online payment', async () => {
      const { order, payment } = await orderBook(user, 1, { ...courier, paymentMethod: 'CASH' });
      expect(order).toMatchObject({ paymentMethod: 'CASH', expiresAt: null, payments: [] });
      expect(payment).toBeNull();
    });

    it('rejects the order when prices changed since the customer looked', async () => {
      await as(user).post('/cart/items', { bookId: book.id }).expect(201);

      const response = await as(user)
        .post('/orders', { ...courier, expectedTotal: 80_000 })
        .expect(409);
      expect(response.body.details).toEqual({ expectedTotal: 80_000, total: 85_000 });
      expect(await t.prisma.order.count()).toBe(0);
      await expect(
        t.prisma.book.findUniqueOrThrow({ where: { id: book.id } }),
      ).resolves.toMatchObject({
        stockQuantity: 5,
      });
    });

    it('rejects an empty cart and items that became unavailable', async () => {
      await as(user).post('/orders', courier).expect(400);

      await as(user).post('/cart/items', { bookId: book.id }).expect(201);
      await t.prisma.book.update({ where: { id: book.id }, data: { status: 'ARCHIVED' } });
      const response = await as(user).post('/orders', courier).expect(409);
      expect(response.body.details).toEqual([expect.objectContaining({ issue: 'UNAVAILABLE' })]);
    });

    it('never sells the last copy twice', async () => {
      const last = await createBook({ title: 'Последний экземпляр', stockQuantity: 1 });
      const buyers = [user, await registerUser(t), await registerUser(t)];
      for (const buyer of buyers) {
        await as(buyer).post('/cart/items', { bookId: last.id }).expect(201);
      }

      const results = await Promise.all(buyers.map((buyer) => as(buyer).post('/orders', courier)));

      expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
      await expect(
        t.prisma.book.findUniqueOrThrow({ where: { id: last.id } }),
      ).resolves.toMatchObject({
        stockQuantity: 0,
      });
      expect(await t.prisma.order.count()).toBe(1);
    });
  });

  describe('payments', () => {
    it('marks the order paid once, even if the webhook is repeated', async () => {
      const { order, payment } = await orderBook(user);
      const event = {
        eventId: 'evt-1',
        paymentId: payment.id,
        amount: order.total,
        status: 'SUCCEEDED' as const,
      };

      const first = await webhook(event).expect(200);
      expect(first.body.data).toEqual({ received: true, outcome: 'processed' });
      const second = await webhook(event).expect(200);
      expect(second.body.data.outcome).toBe('duplicate');

      const paid = (await as(user).get(`/orders/${order.orderNumber}`).expect(200)).body.data;
      expect(paid.status).toBe('PAID');
      expect(paid.payments).toEqual([
        expect.objectContaining({
          status: 'SUCCEEDED',
          paidAt: expect.any(String),
          paymentUrl: null,
        }),
      ]);
      expect(paid.statusHistory.map((h: { newStatus: string }) => h.newStatus)).toEqual([
        'PENDING',
        'PAID',
      ]);

      await expect(
        t.prisma.book.findUniqueOrThrow({ where: { id: book.id } }),
      ).resolves.toMatchObject({
        salesCount: 1,
      });
      expect(await t.prisma.paymentEvent.count()).toBe(1);
    });

    it('grants audiobook access after payment and completes a digital order', async () => {
      await as(user).post('/cart/items', { audiobookId: audiobook.id }).expect(201);
      const { order, payment } = (await as(user).post('/orders', digital).expect(201)).body.data;

      await as(user)
        .get(`/audiobooks/${audiobook.slug}/chapters/${audiobook.paidChapterId}/stream`)
        .expect(403);
      await pay(payment.id, order.total).expect(200);

      const completed = (await as(user).get(`/orders/${order.orderNumber}`)).body.data;
      expect(completed.status).toBe('COMPLETED');
      await as(user)
        .get(`/audiobooks/${audiobook.slug}/chapters/${audiobook.paidChapterId}/stream`)
        .expect(200);

      const library = (await as(user).get('/users/me/audiobooks')).body.data;
      expect(library).toHaveLength(1);

      // Купленную аудиокнигу нельзя положить в корзину повторно
      await as(user).post('/cart/items', { audiobookId: audiobook.id }).expect(409);
    });

    it('revokes access and restores counters on refund', async () => {
      await as(user).post('/cart/items', { audiobookId: audiobook.id }).expect(201);
      const { order, payment } = (await as(user).post('/orders', digital).expect(201)).body.data;
      await pay(payment.id, order.total).expect(200);

      await pay(payment.id, order.total, 'REFUNDED').expect(200);

      expect((await as(user).get(`/orders/${order.orderNumber}`)).body.data.status).toBe(
        'REFUNDED',
      );
      await as(user)
        .get(`/audiobooks/${audiobook.slug}/chapters/${audiobook.paidChapterId}/stream`)
        .expect(403);
      await expect(
        t.prisma.audiobook.findUniqueOrThrow({ where: { id: audiobook.id } }),
      ).resolves.toMatchObject({
        salesCount: 0,
      });
    });

    it('rejects forged webhooks and unknown providers', async () => {
      const { order, payment } = await orderBook(user);
      const body = {
        eventId: 'evt-x',
        paymentId: payment.id,
        amount: order.total,
        status: 'SUCCEEDED' as const,
      };

      await webhook(body, signTestWebhook(body, 'wrong-secret')).expect(401);
      await webhook({ ...body, amount: 1 }, signTestWebhook(body, 'test-payment-secret')).expect(
        401,
      );
      await t.http().post(api('/payments/webhooks/paypal')).send(body).expect(404);

      expect((await as(user).get(`/orders/${order.orderNumber}`)).body.data.status).toBe('PENDING');
    });

    it('does not mark the order paid when the amount does not match', async () => {
      const { order, payment } = await orderBook(user);
      await pay(payment.id, order.total - 100).expect(200);

      expect((await as(user).get(`/orders/${order.orderNumber}`)).body.data.status).toBe('PENDING');
      await expect(
        t.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      ).resolves.toMatchObject({
        status: 'PENDING',
        requiresReview: true,
        reviewReason: expect.stringContaining('Amount mismatch'),
      });
    });

    it('allows another attempt after a failed payment', async () => {
      const { order, payment } = await orderBook(user);

      const same = await as(user).post(`/orders/${order.orderNumber}/payments`).expect(201);
      expect(same.body.data.id).toBe(payment.id);

      await pay(payment.id, order.total, 'FAILED').expect(200);
      const retry = await as(user).post(`/orders/${order.orderNumber}/payments`).expect(201);
      expect(retry.body.data.id).not.toBe(payment.id);

      await pay(retry.body.data.id, order.total).expect(200);
      expect((await as(user).get(`/orders/${order.orderNumber}`)).body.data.status).toBe('PAID');
    });

    it('does not create payments for cash, paid or foreign orders', async () => {
      const cash = await orderBook(user, 1, { ...courier, paymentMethod: 'CASH' });
      await as(user).post(`/orders/${cash.order.orderNumber}/payments`).expect(409);

      const online = await orderBook(user);
      await pay(online.payment.id, online.order.total).expect(200);
      await as(user).post(`/orders/${online.order.orderNumber}/payments`).expect(409);

      const stranger = await registerUser(t);
      await as(stranger).post(`/orders/${online.order.orderNumber}/payments`).expect(404);
    });

    it('simulates a payment result with the test provider', async () => {
      const { order, payment } = await orderBook(user);
      await as(user)
        .post(`/payments/test/${payment.id}/simulate`, { status: 'SUCCEEDED' })
        .expect(200);
      expect((await as(user).get(`/orders/${order.orderNumber}`)).body.data.status).toBe('PAID');
    });
  });

  describe('unpaid orders', () => {
    it('are cancelled after the payment time and return books to stock', async () => {
      const { order, payment } = await orderBook(user, 2);
      await t.prisma.order.update({
        where: { id: order.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(t.app.get(OrderLifecycleService).expireUnpaid()).resolves.toBe(1);

      const cancelled = (await as(user).get(`/orders/${order.orderNumber}`)).body.data;
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.statusHistory.at(-1)).toMatchObject({
        newStatus: 'CANCELLED',
        comment: 'Payment time expired',
      });
      await expect(
        t.prisma.book.findUniqueOrThrow({ where: { id: book.id } }),
      ).resolves.toMatchObject({
        stockQuantity: 5,
      });
      await expect(
        t.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      ).resolves.toMatchObject({
        status: 'CANCELLED',
      });

      await as(user).post(`/orders/${order.orderNumber}/payments`).expect(409);
    });

    it('flag a payment that arrives after cancellation for a refund', async () => {
      const { order, payment } = await orderBook(user);
      await t.prisma.order.update({
        where: { id: order.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await t.app.get(OrderLifecycleService).expireUnpaid();

      await pay(payment.id, order.total).expect(200);

      expect((await as(user).get(`/orders/${order.orderNumber}`)).body.data.status).toBe(
        'CANCELLED',
      );
      await expect(
        t.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      ).resolves.toMatchObject({
        status: 'SUCCEEDED',
        requiresReview: true,
        reviewReason: expect.stringContaining('refund required'),
      });
    });

    it('do not expire cash orders', async () => {
      const { order } = await orderBook(user, 1, { ...courier, paymentMethod: 'CASH' });
      await expect(
        t.app.get(OrderLifecycleService).expireUnpaid(new Date(Date.now() + 86_400_000)),
      ).resolves.toBe(0);
      expect((await as(user).get(`/orders/${order.orderNumber}`)).body.data.status).toBe('PENDING');
    });
  });

  describe('my orders', () => {
    it('lists only own orders and lets the customer cancel an unpaid one', async () => {
      const first = await orderBook(user);
      const second = await orderBook(user);
      const stranger = await registerUser(t);
      await orderBook(stranger);

      const list = (await as(user).get('/orders').expect(200)).body;
      expect(list.meta.total).toBe(2);
      expect(list.data.map((o: { orderNumber: string }) => o.orderNumber)).toEqual([
        second.order.orderNumber,
        first.order.orderNumber,
      ]);

      await as(stranger).get(`/orders/${first.order.orderNumber}`).expect(404);
      await as(stranger).post(`/orders/${first.order.orderNumber}/cancel`).expect(404);

      const cancelled = await as(user)
        .post(`/orders/${first.order.orderNumber}/cancel`)
        .expect(200);
      expect(cancelled.body.data.status).toBe('CANCELLED');
      await as(user).post(`/orders/${first.order.orderNumber}/cancel`).expect(409);

      const pending = (await as(user).get('/orders?status=PENDING')).body;
      expect(pending.meta.total).toBe(1);
    });

    it('does not let the customer cancel a paid order', async () => {
      const { order, payment } = await orderBook(user);
      await pay(payment.id, order.total).expect(200);
      await as(user).post(`/orders/${order.orderNumber}/cancel`).expect(409);
    });

    it('publishes delivery options', async () => {
      const response = await t.http().get(api('/orders/delivery-options')).expect(200);
      expect(response.body.data).toEqual([
        { method: 'PICKUP', price: 0, currency: 'KGS', requiresAddress: false },
        { method: 'COURIER', price: 20_000, currency: 'KGS', requiresAddress: true },
        { method: 'POST', price: 30_000, currency: 'KGS', requiresAddress: true },
      ]);
    });
  });
});
