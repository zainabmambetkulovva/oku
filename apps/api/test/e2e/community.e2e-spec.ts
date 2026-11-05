import { randomUUID } from 'crypto';
import { AudioAccessService } from '../../src/modules/listening/audio-access.service';
import { OrderLifecycleService } from '../../src/modules/orders/order-lifecycle.service';
import {
  signTestWebhook,
  TEST_SIGNATURE_HEADER,
} from '../../src/modules/payments/providers/test.provider';
import {
  bearer,
  createAdmin,
  createTestApp,
  registerUser,
  RegisteredUser,
  resetState,
  TestApp,
} from '../helpers/app';

describe('Favorites, reviews, notifications, newsletter (e2e)', () => {
  let t: TestApp;
  let user: RegisteredUser;
  let book: { id: string; slug: string };
  let audiobook: { id: string; slug: string };

  const api = (path: string) => `/api/v1${path}`;
  const as = (u: RegisteredUser) => ({
    get: (path: string) => t.http().get(api(path)).set(bearer(u.accessToken)),
    post: (path: string, body?: object) =>
      t.http().post(api(path)).set(bearer(u.accessToken)).send(body),
    patch: (path: string, body?: object) =>
      t.http().patch(api(path)).set(bearer(u.accessToken)).send(body),
    delete: (path: string) => t.http().delete(api(path)).set(bearer(u.accessToken)),
  });

  const pay = (paymentId: string, amount: number) => {
    const body = { eventId: randomUUID(), paymentId, amount, status: 'SUCCEEDED' as const };
    return t
      .http()
      .post(api('/payments/webhooks/test'))
      .set(TEST_SIGNATURE_HEADER, signTestWebhook(body, 'test-payment-secret'))
      .send(body);
  };

  const notifications = async (u: RegisteredUser) =>
    (await as(u).get('/users/me/notifications').expect(200)).body.data as Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      isRead: boolean;
    }>;

  const pickup = {
    recipientName: 'Айгерим',
    recipientPhone: '+996700123456',
    deliveryMethod: 'PICKUP',
    paymentMethod: 'ONLINE',
  };
  const digital = {
    recipientName: 'Айгерим',
    recipientPhone: '+996700123456',
    paymentMethod: 'ONLINE',
  };

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetState(t);
    user = await registerUser(t);
    await t.prisma.user.update({
      where: { id: user.id },
      data: { firstName: 'Айгерим', lastName: 'Токтогулова' },
    });
    book = await t.prisma.book.create({
      data: {
        title: 'Джамиля',
        author: 'Чингиз Айтматов',
        slug: `jamila-${randomUUID()}`,
        price: 65_000,
        stockQuantity: 10,
        status: 'ACTIVE',
      },
    });
    audiobook = await t.prisma.audiobook.create({
      data: {
        title: 'Джамиля (аудио)',
        author: 'Чингиз Айтматов',
        slug: `audio-${randomUUID()}`,
        price: 45_000,
        durationSeconds: 600,
        status: 'ACTIVE',
        audioChapters: {
          create: {
            chapterNumber: 1,
            title: 'Глава 1',
            durationSeconds: 600,
            storageKey: 'audiobooks/chapters/x/1.mp3',
          },
        },
      },
    });
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('favorites', () => {
    it('adds books and audiobooks once and lists them', async () => {
      const first = await as(user).post('/users/me/favorites', { bookId: book.id }).expect(201);
      const again = await as(user).post('/users/me/favorites', { bookId: book.id }).expect(201);
      expect(again.body.data.id).toBe(first.body.data.id);
      await as(user).post('/users/me/favorites', { audiobookId: audiobook.id }).expect(201);

      const ids = (await as(user).get('/users/me/favorites/ids').expect(200)).body.data;
      expect(ids).toEqual({ bookIds: [book.id], audiobookIds: [audiobook.id] });

      const list = (await as(user).get('/users/me/favorites').expect(200)).body;
      expect(list.meta.total).toBe(2);
      const books = (await as(user).get('/users/me/favorites?type=book').expect(200)).body.data;
      expect(books).toEqual([
        expect.objectContaining({
          product: expect.objectContaining({
            type: 'BOOK',
            id: book.id,
            price: 65_000,
            isAvailable: true,
            inStock: true,
          }),
        }),
      ]);
    });

    it('keeps archived products with a mark and removes favorites', async () => {
      await as(user).post('/users/me/favorites', { bookId: book.id }).expect(201);
      await t.prisma.book.update({ where: { id: book.id }, data: { status: 'ARCHIVED' } });

      const list = (await as(user).get('/users/me/favorites').expect(200)).body.data;
      expect(list[0].product.isAvailable).toBe(false);

      await as(user).delete(`/users/me/favorites/books/${book.id}`).expect(204);
      await as(user).delete(`/users/me/favorites/books/${book.id}`).expect(204);
      expect((await as(user).get('/users/me/favorites')).body.meta.total).toBe(0);
    });

    it('validates input and requires authentication', async () => {
      await as(user).post('/users/me/favorites', {}).expect(400);
      await as(user)
        .post('/users/me/favorites', { bookId: book.id, audiobookId: audiobook.id })
        .expect(400);
      await as(user).post('/users/me/favorites', { bookId: randomUUID() }).expect(404);
      await t.http().get(api('/users/me/favorites')).expect(401);
    });
  });

  describe('reviews', () => {
    const review = (
      u: RegisteredUser,
      body: object = { rating: 5, text: 'Великолепная повесть' },
    ) => as(u).post(`/books/${book.slug}/reviews`, body);

    it('publishes a review immediately and updates the product rating', async () => {
      const created = await review(user).expect(201);
      expect(created.body.data).toMatchObject({
        rating: 5,
        text: 'Великолепная повесть',
        status: 'APPROVED',
        author: { name: 'Айгерим Т.' },
        isVerifiedPurchase: false,
      });

      // Без имени в профиле автор показывается как «Читатель»
      const other = await registerUser(t);
      await t.prisma.user.update({ where: { id: other.id }, data: { firstName: null } });
      await review(other, { rating: 3 }).expect(201);

      const list = await t
        .http()
        .get(api(`/books/${book.slug}/reviews`))
        .expect(200);
      expect(list.body.meta.total).toBe(2);
      expect(list.body.data[0]).toEqual(
        expect.objectContaining({ rating: 3, author: { name: 'Читатель' } }),
      );

      const summary = await t
        .http()
        .get(api(`/books/${book.slug}/reviews/summary`))
        .expect(200);
      expect(summary.body.data).toEqual({
        average: 4,
        count: 2,
        distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
      });

      // Рейтинг сразу виден в каталоге (кэш сброшен)
      const catalog = await t
        .http()
        .get(api(`/books/${book.slug}`))
        .expect(200);
      expect(catalog.body.data.rating).toEqual({ average: 4, count: 2 });
    });

    it('allows one review per product, editable and removable by its author', async () => {
      const created = (await review(user).expect(201)).body.data;
      await review(user, { rating: 4 }).expect(409);

      const stranger = await registerUser(t);
      await as(stranger).patch(`/reviews/${created.id}`, { rating: 1 }).expect(404);
      await as(stranger).delete(`/reviews/${created.id}`).expect(404);

      const updated = await as(user)
        .patch(`/reviews/${created.id}`, { rating: 4, text: null })
        .expect(200);
      expect(updated.body.data).toMatchObject({ rating: 4, text: null });

      const mine = (await as(user).get('/users/me/reviews').expect(200)).body.data;
      expect(mine).toEqual([
        expect.objectContaining({
          id: created.id,
          product: expect.objectContaining({ id: book.id }),
        }),
      ]);

      await as(user).delete(`/reviews/${created.id}`).expect(204);
      await review(user, { rating: 2 }).expect(201);
    });

    it('marks reviews of buyers', async () => {
      await as(user).post('/cart/items', { bookId: book.id }).expect(201);
      const { order, payment } = (await as(user).post('/orders', pickup).expect(201)).body.data;
      await pay(payment.id, order.total).expect(200);

      const created = await review(user).expect(201);
      expect(created.body.data.isVerifiedPurchase).toBe(true);
    });

    it('validates input and access', async () => {
      await review(user, { rating: 0 }).expect(400);
      await review(user, { rating: 6 }).expect(400);
      await review(user, { rating: 5, text: 'x'.repeat(2001) }).expect(400);
      await t
        .http()
        .post(api(`/books/${book.slug}/reviews`))
        .send({ rating: 5 })
        .expect(401);
      await as(user).post('/books/unknown/reviews', { rating: 5 }).expect(404);
      await as(user).post(`/audiobooks/${audiobook.slug}/reviews`, { rating: 4 }).expect(201);
    });

    it('lets administrators hide, restore and delete reviews', async () => {
      const admin = await createAdmin(t);
      const created = (await review(user, { rating: 1, text: 'Спам' }).expect(201)).body.data;

      await as(user).get('/admin/reviews').expect(403);
      const queue = await as(admin).get('/admin/reviews?status=APPROVED').expect(200);
      expect(queue.body.data[0].user.email).toBe(user.email);

      await as(admin).patch(`/admin/reviews/${created.id}`, { status: 'REJECTED' }).expect(200);
      expect((await t.http().get(api(`/books/${book.slug}/reviews`))).body.meta.total).toBe(0);
      expect((await t.http().get(api(`/books/${book.slug}`))).body.data.rating).toEqual({
        average: null,
        count: 0,
      });
      await as(user).patch(`/reviews/${created.id}`, { rating: 5 }).expect(409);

      await as(admin).patch(`/admin/reviews/${created.id}`, { status: 'APPROVED' }).expect(200);
      expect((await t.http().get(api(`/books/${book.slug}/reviews`))).body.meta.total).toBe(1);

      await as(admin).delete(`/admin/reviews/${created.id}`).expect(204);
      expect((await t.http().get(api(`/books/${book.slug}/reviews`))).body.meta.total).toBe(0);

      const actions = (
        await t.prisma.auditLog.findMany({
          where: { entityType: 'review' },
          orderBy: { createdAt: 'asc' },
        })
      ).map((a) => a.action);
      expect(actions).toEqual(['review.reject', 'review.approve', 'review.delete']);
    });

    it('sorts reviews by rating', async () => {
      await review(user, { rating: 2 }).expect(201);
      await review(await registerUser(t), { rating: 5 }).expect(201);
      const list = await t
        .http()
        .get(api(`/books/${book.slug}/reviews?sort=rating_desc`))
        .expect(200);
      expect(list.body.data.map((r: { rating: number }) => r.rating)).toEqual([5, 2]);
    });
  });

  describe('notifications', () => {
    it('notifies about order creation and payment in the account and by e-mail', async () => {
      t.mail.clear();
      await as(user).post('/cart/items', { bookId: book.id }).expect(201);
      const { order, payment } = (await as(user).post('/orders', pickup).expect(201)).body.data;

      let list = await notifications(user);
      expect(list).toEqual([
        expect.objectContaining({
          type: 'ORDER_CREATED',
          title: 'Заказ оформлен',
          message: expect.stringContaining(`Заказ ${order.orderNumber} на сумму 650 сом оформлен`),
          isRead: false,
        }),
      ]);
      expect(t.mail.to(user.email).at(-1)!.subject).toContain('Заказ оформлен');

      await pay(payment.id, order.total).expect(200);
      list = await notifications(user);
      expect(list.map((n) => n.type)).toEqual(['ORDER_PAID', 'ORDER_CREATED']);
      expect(t.mail.to(user.email).at(-1)!.text).toContain(
        `http://frontend.test/orders/${order.orderNumber}`,
      );
    });

    it('sends a single completion notice for a digital order', async () => {
      await as(user).post('/cart/items', { audiobookId: audiobook.id }).expect(201);
      const { order, payment } = (await as(user).post('/orders', digital).expect(201)).body.data;
      await pay(payment.id, order.total).expect(200);

      const list = await notifications(user);
      expect(list.map((n) => n.type)).toEqual(['ORDER_COMPLETED', 'ORDER_CREATED']);
      expect(list[0].message).toContain('«Мои аудиокниги»');
    });

    it('explains why an unpaid order was cancelled', async () => {
      await as(user).post('/cart/items', { bookId: book.id }).expect(201);
      const { order } = (await as(user).post('/orders', pickup).expect(201)).body.data;
      await t.prisma.order.update({
        where: { id: order.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await t.app.get(OrderLifecycleService).expireUnpaid();

      const [latest] = await notifications(user);
      expect(latest).toMatchObject({
        type: 'ORDER_CANCELLED',
        message: expect.stringContaining('время на оплату истекло'),
      });
    });

    it('notifies when an administrator grants access', async () => {
      const admin = await createAdmin(t);
      await as(admin)
        .post(`/admin/audiobooks/${audiobook.id}/access`, { email: user.email })
        .expect(201);

      const [latest] = await notifications(user);
      expect(latest).toMatchObject({
        type: 'ACCESS_GRANTED',
        message: expect.stringContaining('Джамиля (аудио)'),
      });
    });

    it('does not notify when the payment transaction is rolled back', async () => {
      await as(user).post('/cart/items', { audiobookId: audiobook.id }).expect(201);
      const { order, payment } = (await as(user).post('/orders', digital).expect(201)).body.data;

      const grant = jest
        .spyOn(t.app.get(AudioAccessService), 'grantForOrderItem')
        .mockRejectedValueOnce(new Error('storage outage'));
      const body = {
        eventId: 'evt-rollback',
        paymentId: payment.id,
        amount: order.total,
        status: 'SUCCEEDED' as const,
      };
      const send = () =>
        t
          .http()
          .post(api('/payments/webhooks/test'))
          .set(TEST_SIGNATURE_HEADER, signTestWebhook(body, 'test-payment-secret'))
          .send(body);

      await send().expect(500);
      expect((await notifications(user)).map((n) => n.type)).toEqual(['ORDER_CREATED']);
      expect((await as(user).get(`/orders/${order.orderNumber}`)).body.data.status).toBe('PENDING');
      expect(await t.prisma.paymentEvent.count()).toBe(0);

      // Провайдер повторяет уведомление — теперь всё проходит
      grant.mockRestore();
      await send().expect(200);
      expect((await notifications(user)).map((n) => n.type)).toEqual([
        'ORDER_COMPLETED',
        'ORDER_CREATED',
      ]);
    });

    it('counts, reads and filters notifications of the current user only', async () => {
      await as(user).post('/cart/items', { bookId: book.id }).expect(201);
      await as(user).post('/orders', pickup).expect(201);
      await as(user).post('/cart/items', { bookId: book.id }).expect(201);
      await as(user).post('/orders', pickup).expect(201);

      expect((await as(user).get('/users/me/notifications/unread-count')).body.data).toEqual({
        unread: 2,
      });
      const [first] = await notifications(user);

      const stranger = await registerUser(t);
      await as(stranger).patch(`/users/me/notifications/${first.id}/read`).expect(404);

      const read = await as(user).patch(`/users/me/notifications/${first.id}/read`).expect(200);
      expect(read.body.data).toMatchObject({ isRead: true, readAt: expect.any(String) });

      const unread = (await as(user).get('/users/me/notifications?unreadOnly=true')).body;
      expect(unread.meta.total).toBe(1);

      expect(
        (await as(user).post('/users/me/notifications/read-all').expect(200)).body.data,
      ).toEqual({ updated: 1 });
      expect((await as(user).get('/users/me/notifications/unread-count')).body.data).toEqual({
        unread: 0,
      });
    });
  });

  describe('newsletter', () => {
    const subscriber = (email: string) =>
      t.prisma.newsletterSubscriber.findUnique({ where: { email } });

    it('subscribes, unsubscribes by the link from the e-mail and resubscribes', async () => {
      await t
        .http()
        .post(api('/newsletter/subscribe'))
        .send({ email: ' News@Example.KG ' })
        .expect(204);
      await expect(subscriber('news@example.kg')).resolves.toMatchObject({ isActive: true });
      expect(t.mail.to('news@example.kg')).toHaveLength(1);

      // Повторная подписка не шлёт второе письмо
      await t
        .http()
        .post(api('/newsletter/subscribe'))
        .send({ email: 'news@example.kg' })
        .expect(204);
      expect(t.mail.to('news@example.kg')).toHaveLength(1);

      const token = t.mail.lastToken('news@example.kg');
      await t.http().post(api('/newsletter/unsubscribe')).send({ token }).expect(204);
      await expect(subscriber('news@example.kg')).resolves.toMatchObject({
        isActive: false,
        unsubscribedAt: expect.any(Date),
      });
      await t.http().post(api('/newsletter/unsubscribe')).send({ token }).expect(204);

      await t
        .http()
        .post(api('/newsletter/subscribe'))
        .send({ email: 'news@example.kg' })
        .expect(204);
      await expect(subscriber('news@example.kg')).resolves.toMatchObject({
        isActive: true,
        unsubscribedAt: null,
      });
    });

    it('rejects forged unsubscribe links and invalid e-mails', async () => {
      await t
        .http()
        .post(api('/newsletter/unsubscribe'))
        .send({ token: 'forged.token' })
        .expect(400);
      await t.http().post(api('/newsletter/subscribe')).send({ email: 'not-an-email' }).expect(400);
    });
  });
});
