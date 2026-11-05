import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createAdmin as createAdminCli } from '../../src/cli/create-admin';
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

describe('Admin panel API (e2e)', () => {
  let t: TestApp;
  let admin: RegisteredUser;
  let customer: RegisteredUser;
  let book: { id: string; slug: string };
  let audiobook: { id: string; slug: string; chapterId: string };

  const api = (path: string) => `/api/v1${path}`;
  const as = (u: RegisteredUser) => ({
    get: (path: string) => t.http().get(api(path)).set(bearer(u.accessToken)),
    post: (path: string, body?: object) =>
      t.http().post(api(path)).set(bearer(u.accessToken)).send(body),
    patch: (path: string, body?: object) =>
      t.http().patch(api(path)).set(bearer(u.accessToken)).send(body),
  });

  const courier = {
    recipientName: 'Айгерим Токтогулова',
    recipientPhone: '+996 555 111 222',
    deliveryMethod: 'COURIER',
    address: { country: 'Кыргызстан', city: 'Бишкек', street: 'пр. Чуй', building: '1' },
    paymentMethod: 'ONLINE',
  };

  const pay = (paymentId: string, amount: number) => {
    const body = { eventId: randomUUID(), paymentId, amount, status: 'SUCCEEDED' as const };
    return t
      .http()
      .post(api('/payments/webhooks/test'))
      .set(TEST_SIGNATURE_HEADER, signTestWebhook(body, 'test-payment-secret'))
      .send(body)
      .expect(200);
  };

  async function placeOrder(
    body: object = courier,
    item: object = { bookId: book.id, quantity: 2 },
  ) {
    await as(customer).post('/cart/items', item).expect(201);
    return (await as(customer).post('/orders', body).expect(201)).body.data as {
      order: { id: string; orderNumber: string; total: number };
      payment: { id: string } | null;
    };
  }

  async function paidOrder(body: object = courier) {
    const { order, payment } = await placeOrder(body);
    await pay(payment!.id, order.total);
    return order;
  }

  const setStatus = (orderNumber: string, status: string, comment?: string) =>
    as(admin).patch(`/admin/orders/${orderNumber}/status`, { status, comment });

  const stock = async () =>
    (await t.prisma.book.findUniqueOrThrow({ where: { id: book.id } })).stockQuantity;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetState(t);
    admin = await createAdmin(t);
    customer = await registerUser(t);
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
    const created = await t.prisma.audiobook.create({
      data: {
        title: 'Аудио',
        author: 'Автор',
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
      include: { audioChapters: true },
    });
    audiobook = { id: created.id, slug: created.slug, chapterId: created.audioChapters[0].id };
  });

  afterAll(async () => {
    await t?.app.close();
  });

  it('is available to administrators only', async () => {
    const paths = [
      '/admin/dashboard',
      '/admin/analytics/sales',
      '/admin/orders',
      '/admin/payments',
      '/admin/users',
      '/admin/audit-logs',
      '/admin/newsletter/subscribers',
    ];
    for (const path of paths) {
      await t.http().get(api(path)).expect(401);
      await as(customer).get(path).expect(403);
      await as(admin).get(path).expect(200);
    }
  });

  describe('dashboard and analytics', () => {
    it('summarises users, catalog, orders, revenue, popular products and alerts', async () => {
      const online = await paidOrder();
      const cash = await placeOrder(
        { ...courier, deliveryMethod: 'PICKUP', address: undefined, paymentMethod: 'CASH' },
        { bookId: book.id, quantity: 1 },
      );
      await setStatus(cash.order.orderNumber, 'PROCESSING').expect(200);
      await setStatus(cash.order.orderNumber, 'COMPLETED').expect(200);
      await placeOrder(); // ожидает оплаты
      await t.prisma.book.create({
        data: {
          title: 'Последние',
          author: 'А',
          slug: `low-${randomUUID()}`,
          price: 1000,
          stockQuantity: 2,
          status: 'ACTIVE',
        },
      });

      const { data } = (await as(admin).get('/admin/dashboard').expect(200)).body;

      expect(data.users).toEqual({ total: 2, newLast30Days: 2 });
      expect(data.books).toEqual({ total: 2, active: 2 });
      expect(data.audiobooks).toEqual({ total: 1, active: 1 });
      expect(data.orders.total).toBe(3);
      expect(data.orders.byStatus).toMatchObject({
        PAID: 1,
        COMPLETED: 1,
        PENDING: 1,
        CANCELLED: 0,
      });
      expect(data.sales).toEqual({
        currency: 'KGS',
        totalRevenue: online.total + cash.order.total,
        revenueLast30Days: online.total + cash.order.total,
      });
      expect(data.recentOrders).toHaveLength(3);
      expect(data.popular.books[0]).toMatchObject({ id: book.id, salesCount: 3 });
      expect(data.alerts.lowStockBooks.map((b: { title: string }) => b.title)).toEqual([
        'Последние',
      ]);
      expect(data.alerts.paymentsToReview).toBe(0);
    });

    it('builds a sales series without gaps', async () => {
      const order = await paidOrder();
      const from = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();

      const { data } = (
        await as(admin).get(`/admin/analytics/sales?from=${from}&groupBy=day`).expect(200)
      ).body;
      expect(data.series).toHaveLength(7);
      expect(data.totalRevenue).toBe(order.total);
      expect(data.totalOrders).toBe(1);
      expect(data.series.at(-1)).toMatchObject({ ordersCount: 1, revenue: order.total });

      await as(admin).get('/admin/analytics/sales?groupBy=year').expect(400);
      await as(admin)
        .get(`/admin/analytics/sales?from=${new Date().toISOString()}&to=${from}`)
        .expect(400);
    });
  });

  describe('orders', () => {
    it('finds orders by number, e-mail, phone and status', async () => {
      const first = await paidOrder();
      await placeOrder();

      const byNumber = (await as(admin).get(`/admin/orders?search=${first.orderNumber.slice(-5)}`))
        .body;
      expect(byNumber.data.map((o: { orderNumber: string }) => o.orderNumber)).toEqual([
        first.orderNumber,
      ]);

      expect(
        (await as(admin).get(`/admin/orders?search=${customer.email.toUpperCase()}`)).body.meta
          .total,
      ).toBe(2);
      expect((await as(admin).get('/admin/orders?search=555 111')).body.meta.total).toBe(2);
      expect((await as(admin).get('/admin/orders?status=PAID')).body.meta.total).toBe(1);
      expect((await as(admin).get(`/admin/users/${customer.id}/orders`)).body.meta.total).toBe(2);
    });

    it('moves an order through delivery, notifies the customer and logs who did it', async () => {
      const order = await paidOrder();

      await setStatus(order.orderNumber, 'PROCESSING', 'Собираем').expect(200);
      await setStatus(order.orderNumber, 'SHIPPED').expect(200);
      const completed = (await setStatus(order.orderNumber, 'COMPLETED').expect(200)).body.data;

      expect(completed.status).toBe('COMPLETED');
      expect(completed.customer).toMatchObject({ id: customer.id, email: customer.email });
      expect(completed.statusHistory.map((h: { newStatus: string }) => h.newStatus)).toEqual([
        'PENDING',
        'PAID',
        'PROCESSING',
        'SHIPPED',
        'COMPLETED',
      ]);
      expect(completed.statusHistory[2]).toMatchObject({
        comment: 'Собираем',
        changedBy: { id: admin.id, email: admin.email },
      });

      const types = (await as(customer).get('/users/me/notifications')).body.data.map(
        (n: { type: string }) => n.type,
      );
      expect(types.slice(0, 3)).toEqual(['ORDER_COMPLETED', 'ORDER_SHIPPED', 'ORDER_PROCESSING']);

      const logs = (await as(admin).get('/admin/audit-logs?action=order.')).body.data;
      expect(logs).toHaveLength(3);
      expect(logs[0]).toMatchObject({ action: 'order.status', user: { email: admin.email } });
    });

    it('enforces the order workflow', async () => {
      const unpaid = await placeOrder();
      await setStatus(unpaid.order.orderNumber, 'PROCESSING').expect(409);

      const paid = await paidOrder();
      await setStatus(paid.orderNumber, 'CANCELLED').expect(409);
      await as(admin)
        .patch(`/admin/orders/${paid.orderNumber}/status`, { status: 'PAID' })
        .expect(400);
      await setStatus(paid.orderNumber, 'COMPLETED').expect(200);
      await setStatus(paid.orderNumber, 'PROCESSING').expect(409);

      const pickup = await paidOrder({ ...courier, deliveryMethod: 'PICKUP', address: undefined });
      await setStatus(pickup.orderNumber, 'PROCESSING').expect(200);
      await setStatus(pickup.orderNumber, 'SHIPPED').expect(409);

      await as(admin).get('/admin/orders/OKU-000000-XXXXX').expect(404);
    });

    it('records cash payment on completion and returns stock when a cash order is cancelled', async () => {
      const cashBody = {
        ...courier,
        deliveryMethod: 'PICKUP',
        address: undefined,
        paymentMethod: 'CASH',
      };
      const done = await placeOrder(cashBody);
      await setStatus(done.order.orderNumber, 'PROCESSING').expect(200);
      const completed = (await setStatus(done.order.orderNumber, 'COMPLETED').expect(200)).body
        .data;
      expect(completed.payments).toEqual([
        expect.objectContaining({
          provider: 'cash',
          paymentMethod: 'CASH',
          status: 'SUCCEEDED',
          amount: done.order.total,
        }),
      ]);
      await expect(
        t.prisma.book.findUniqueOrThrow({ where: { id: book.id } }),
      ).resolves.toMatchObject({ salesCount: 2 });

      const before = await stock();
      const cancelled = await placeOrder(cashBody);
      expect(await stock()).toBe(before - 2);
      await setStatus(cancelled.order.orderNumber, 'CANCELLED', 'Покупатель не пришёл').expect(200);
      expect(await stock()).toBe(before);
    });

    it('marks refunds: stock returns, audiobook access is revoked', async () => {
      const order = await paidOrder();
      const before = await stock();
      const refunded = (
        await as(admin)
          .post(`/admin/orders/${order.orderNumber}/refund`, {
            comment: 'Возврат в кабинете Finik',
          })
          .expect(200)
      ).body.data;
      expect(refunded.status).toBe('REFUNDED');
      expect(refunded.payments[0].status).toBe('REFUNDED');
      expect(await stock()).toBe(before + 2);

      const digital = await placeOrder(
        { recipientName: 'А', recipientPhone: '+996700000000', paymentMethod: 'ONLINE' },
        { audiobookId: audiobook.id },
      );
      await pay(digital.payment!.id, digital.order.total);
      await as(customer)
        .get(`/audiobooks/${audiobook.slug}/chapters/${audiobook.chapterId}/stream`)
        .expect(200);
      await as(admin).post(`/admin/orders/${digital.order.orderNumber}/refund`, {}).expect(200);
      await as(customer)
        .get(`/audiobooks/${audiobook.slug}/chapters/${audiobook.chapterId}/stream`)
        .expect(403);

      const unpaid = await placeOrder();
      await as(admin).post(`/admin/orders/${unpaid.order.orderNumber}/refund`, {}).expect(409);
    });
  });

  describe('payments requiring review', () => {
    it('lists flagged payments and resolves them', async () => {
      const { order, payment } = await placeOrder();
      await t.prisma.order.update({
        where: { id: order.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await t.app.get(OrderLifecycleService).expireUnpaid();
      await pay(payment!.id, order.total);

      expect((await as(admin).get('/admin/dashboard')).body.data.alerts.paymentsToReview).toBe(1);
      const flagged = (await as(admin).get('/admin/payments?requiresReview=true')).body.data;
      expect(flagged).toEqual([
        expect.objectContaining({
          id: payment!.id,
          order: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      ]);
      expect((await as(admin).get('/admin/orders?requiresReview=true')).body.meta.total).toBe(1);

      const resolved = await as(admin)
        .post(`/admin/payments/${payment!.id}/resolve`, {
          refunded: true,
          note: 'Возвращено в Finik',
        })
        .expect(200);
      expect(resolved.body.data).toMatchObject({ status: 'REFUNDED', requiresReview: false });
      await as(admin)
        .post(`/admin/payments/${payment!.id}/resolve`, { refunded: true, note: 'again' })
        .expect(409);
      expect((await as(admin).get('/admin/payments?requiresReview=true')).body.meta.total).toBe(0);
    });
  });

  describe('users', () => {
    it('finds users and shows their purchase statistics', async () => {
      const order = await paidOrder();

      const found = (await as(admin).get(`/admin/users?search=${customer.email}`)).body;
      expect(found.data).toEqual([
        expect.objectContaining({ id: customer.id, ordersCount: 1, role: 'USER', isLocked: false }),
      ]);
      expect(found.data[0]).not.toHaveProperty('passwordHash');
      expect((await as(admin).get('/admin/users?role=ADMIN')).body.meta.total).toBe(1);

      const details = (await as(admin).get(`/admin/users/${customer.id}`)).body.data;
      expect(details.stats).toEqual({
        ordersCount: 1,
        paidOrdersCount: 1,
        totalSpent: order.total,
        audiobooksCount: 0,
        reviewsCount: 0,
      });
    });

    it('blocks users immediately and unlocks failed logins', async () => {
      await as(admin).patch(`/admin/users/${customer.id}/status`, { status: 'BANNED' }).expect(200);
      await as(customer).get('/users/me').expect(401);
      await t
        .http()
        .post(api('/auth/login'))
        .send({ email: customer.email, password: customer.password })
        .expect(403);

      await as(admin).patch(`/admin/users/${customer.id}/status`, { status: 'ACTIVE' }).expect(200);
      await t
        .http()
        .post(api('/auth/login'))
        .send({ email: customer.email, password: customer.password })
        .expect(200);

      await as(admin).patch(`/admin/users/${admin.id}/status`, { status: 'BANNED' }).expect(400);

      await t.prisma.user.update({
        where: { id: customer.id },
        data: { lockedUntil: new Date(Date.now() + 600_000), failedLoginAttempts: 0 },
      });
      const unlocked = (await as(admin).post(`/admin/users/${customer.id}/unlock`).expect(200)).body
        .data;
      expect(unlocked).toMatchObject({ isLocked: false, lockedUntil: null });
    });

    it('lets only role managers change roles', async () => {
      await as(admin).patch(`/admin/users/${customer.id}/role`, { role: 'ADMIN' }).expect(403);

      const manager = await registerUser(t, { email: 'roles@test.local' });
      await as(manager).patch(`/admin/users/${customer.id}/role`, { role: 'ADMIN' }).expect(403); // ещё не администратор
      await t.prisma.user.update({ where: { id: manager.id }, data: { role: 'ADMIN' } });

      const promoted = (
        await as(manager).patch(`/admin/users/${customer.id}/role`, { role: 'ADMIN' }).expect(200)
      ).body.data;
      expect(promoted.role).toBe('ADMIN');
      await as(customer).get('/admin/dashboard').expect(200);

      await as(manager).patch(`/admin/users/${manager.id}/role`, { role: 'USER' }).expect(400);
      await as(manager).patch(`/admin/users/${customer.id}/role`, { role: 'USER' }).expect(200);
      await as(customer).get('/admin/dashboard').expect(403);

      const details = (await as(admin).get(`/admin/users/${manager.id}`)).body.data;
      expect(details.isRoleManager).toBe(true);
      expect((await as(admin).get('/admin/audit-logs?action=user.role')).body.meta.total).toBe(2);
    });
  });

  describe('newsletter subscribers', () => {
    it('lists subscribers and exports a safe CSV', async () => {
      await t
        .http()
        .post(api('/newsletter/subscribe'))
        .send({ email: 'reader@example.kg' })
        .expect(204);
      await t.prisma.newsletterSubscriber.create({ data: { email: '=cmd@example.kg' } });
      await t.prisma.newsletterSubscriber.create({
        data: { email: 'gone@example.kg', isActive: false },
      });

      expect(
        (await as(admin).get('/admin/newsletter/subscribers?status=active')).body.meta.total,
      ).toBe(2);

      const csv = await as(admin).get('/admin/newsletter/subscribers/export').expect(200);
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.headers['content-disposition']).toContain('oku24-subscribers.csv');
      const lines = csv.text.trim().split('\n');
      expect(lines[0]).toBe('email,subscribed_at');
      expect(lines).toHaveLength(3);
      expect(csv.text).toContain("'=cmd@example.kg");
      expect(csv.text).not.toContain('gone@example.kg');
    });
  });

  describe('first administrator (server command)', () => {
    it('promotes an existing user or creates a new administrator', async () => {
      const prisma = t.prisma as unknown as PrismaClient;

      await expect(
        createAdminCli(prisma, { email: customer.email.toUpperCase() }),
      ).resolves.toEqual({ email: customer.email, created: false });
      await expect(
        t.prisma.user.findUniqueOrThrow({ where: { id: customer.id } }),
      ).resolves.toMatchObject({ role: 'ADMIN' });

      await expect(
        createAdminCli(prisma, { email: 'owner@oku24.kg', password: 'Secret123' }),
      ).resolves.toEqual({ email: 'owner@oku24.kg', created: true });
      await t
        .http()
        .post(api('/auth/login'))
        .send({ email: 'owner@oku24.kg', password: 'Secret123' })
        .expect(200);

      await expect(createAdminCli(prisma, { email: 'nobody@oku24.kg' })).rejects.toThrow(
        /register first/,
      );
      await expect(
        createAdminCli(prisma, { email: 'weak@oku24.kg', password: 'short' }),
      ).rejects.toThrow(/Password/);
      await expect(createAdminCli(prisma, { email: 'not-an-email' })).rejects.toThrow(
        /Invalid e-mail/,
      );
    });
  });
});
