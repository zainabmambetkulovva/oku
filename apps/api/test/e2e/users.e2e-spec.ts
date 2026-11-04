import { bearer, createTestApp, login, registerUser, TestApp } from '../helpers/app';
import { truncateAll } from '../helpers/database';

const address = (overrides: Record<string, unknown> = {}) => ({
  title: 'Дом',
  recipientName: 'Айгерим Токтогулова',
  phone: '+996 700 123 456',
  country: 'Кыргызстан',
  city: 'Бишкек',
  street: 'пр. Чуй',
  building: '100',
  ...overrides,
});

describe('Users (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(() => truncateAll(t.prisma));

  afterAll(async () => {
    await t?.app.close();
  });

  describe('profile', () => {
    it('updates names and phone', async () => {
      const user = await registerUser(t);

      const response = await t
        .http()
        .patch('/api/v1/users/me')
        .set(bearer(user.accessToken))
        .send({ firstName: ' Айгерим ', lastName: 'Токтогулова', phone: '+996 700 123 456' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        firstName: 'Айгерим',
        lastName: 'Токтогулова',
        phone: '+996 700 123 456',
      });

      const cleared = await t
        .http()
        .patch('/api/v1/users/me')
        .set(bearer(user.accessToken))
        .send({ phone: null })
        .expect(200);
      expect(cleared.body.data.phone).toBeNull();
    });

    it('does not allow changing role, status or e-mail', async () => {
      const user = await registerUser(t);

      for (const field of [{ role: 'ADMIN' }, { status: 'ACTIVE' }, { email: 'x@example.kg' }]) {
        await t
          .http()
          .patch('/api/v1/users/me')
          .set(bearer(user.accessToken))
          .send(field)
          .expect(400);
      }
      await expect(
        t.prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({ role: 'USER', email: user.email });
    });

    it('validates the phone number', async () => {
      const user = await registerUser(t);
      await t
        .http()
        .patch('/api/v1/users/me')
        .set(bearer(user.accessToken))
        .send({ phone: 'call me' })
        .expect(400);
    });
  });

  describe('password change', () => {
    it('changes the password and ends other sessions only', async () => {
      const user = await registerUser(t);
      const otherDevice = await login(t, user.email, user.password);

      await t
        .http()
        .post('/api/v1/users/me/password')
        .set(bearer(user.accessToken))
        .send({ currentPassword: user.password, newPassword: 'NewSecret456' })
        .expect(204);

      await t.http().get('/api/v1/users/me').set(bearer(user.accessToken)).expect(200);
      await t.http().get('/api/v1/users/me').set(bearer(otherDevice.accessToken)).expect(401);
      await login(t, user.email, 'NewSecret456');
    });

    it('requires the correct current password', async () => {
      const user = await registerUser(t);

      const response = await t
        .http()
        .post('/api/v1/users/me/password')
        .set(bearer(user.accessToken))
        .send({ currentPassword: 'Wrong1234', newPassword: 'NewSecret456' })
        .expect(400);
      expect(response.body.message).toBe('Current password is incorrect');
    });

    it('requires a new password that differs from the current one', async () => {
      const user = await registerUser(t);
      await t
        .http()
        .post('/api/v1/users/me/password')
        .set(bearer(user.accessToken))
        .send({ currentPassword: user.password, newPassword: user.password })
        .expect(400);
    });
  });

  describe('addresses', () => {
    const create = (token: string, body = address()) =>
      t.http().post('/api/v1/users/me/addresses').set(bearer(token)).send(body);
    const list = async (token: string) =>
      (await t.http().get('/api/v1/users/me/addresses').set(bearer(token)).expect(200)).body
        .data as Array<{ id: string; title: string; isDefault: boolean }>;

    it('makes the first address the default one', async () => {
      const user = await registerUser(t);

      const response = await create(user.accessToken, address({ isDefault: false })).expect(201);
      expect(response.body.data).toMatchObject({ title: 'Дом', isDefault: true, apartment: null });
    });

    it('keeps exactly one default address', async () => {
      const user = await registerUser(t);
      await create(user.accessToken).expect(201);
      const work = await create(user.accessToken, address({ title: 'Работа', isDefault: true }));

      let addresses = await list(user.accessToken);
      expect(addresses.map((a) => [a.title, a.isDefault])).toEqual([
        ['Работа', true],
        ['Дом', false],
      ]);

      const home = addresses.find((a) => a.title === 'Дом')!;
      await t
        .http()
        .patch(`/api/v1/users/me/addresses/${home.id}`)
        .set(bearer(user.accessToken))
        .send({ isDefault: true })
        .expect(200);

      addresses = await list(user.accessToken);
      expect(addresses.filter((a) => a.isDefault).map((a) => a.title)).toEqual(['Дом']);

      // Снять «по умолчанию» без выбора другого адреса нельзя
      await t
        .http()
        .patch(`/api/v1/users/me/addresses/${home.id}`)
        .set(bearer(user.accessToken))
        .send({ isDefault: false })
        .expect(400);

      expect(work.status).toBe(201);
    });

    it('moves the default to another address when the default one is deleted', async () => {
      const user = await registerUser(t);
      const home = (await create(user.accessToken).expect(201)).body.data;
      await create(user.accessToken, address({ title: 'Работа' })).expect(201);

      await t
        .http()
        .delete(`/api/v1/users/me/addresses/${home.id}`)
        .set(bearer(user.accessToken))
        .expect(204);

      expect(await list(user.accessToken)).toEqual([
        expect.objectContaining({ title: 'Работа', isDefault: true }),
      ]);
    });

    it("does not expose or change other users' addresses", async () => {
      const owner = await registerUser(t);
      const stranger = await registerUser(t);
      const home = (await create(owner.accessToken).expect(201)).body.data;

      expect(await list(stranger.accessToken)).toEqual([]);
      await t
        .http()
        .patch(`/api/v1/users/me/addresses/${home.id}`)
        .set(bearer(stranger.accessToken))
        .send({ title: 'Взлом' })
        .expect(404);
      await t
        .http()
        .delete(`/api/v1/users/me/addresses/${home.id}`)
        .set(bearer(stranger.accessToken))
        .expect(404);

      expect((await list(owner.accessToken))[0].title).toBe('Дом');
    });

    it('validates input', async () => {
      const user = await registerUser(t);

      const response = await create(user.accessToken, address({ city: '', userId: 'x' })).expect(
        400,
      );
      expect(response.body.details.map((d: { field: string }) => d.field).sort()).toEqual([
        'city',
        'userId',
      ]);

      await t
        .http()
        .patch('/api/v1/users/me/addresses/not-a-uuid')
        .set(bearer(user.accessToken))
        .send({ title: 'X' })
        .expect(400);
    });

    it('limits the number of addresses', async () => {
      const user = await registerUser(t);
      await t.prisma.address.createMany({
        data: Array.from({ length: 20 }, (_, i) => ({
          ...address({ title: `A${i}` }),
          userId: user.id,
        })),
      });

      await create(user.accessToken).expect(400);
    });
  });
});
