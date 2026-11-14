import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../src/common/decorators/roles.decorator';
import {
  bearer,
  createTestApp,
  login,
  rawRefreshCookie,
  refreshCookieFrom,
  registerUser,
  TestApp,
} from '../helpers/app';
import { truncateAll } from '../helpers/database';

/** Тестовый маршрут только для администраторов — проверка @Roles. */
@Controller('test-admin-probe')
class AdminProbeController {
  @Roles('ADMIN')
  @Get()
  probe() {
    return { ok: true };
  }
}

describe('Auth (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ controllers: [AdminProbeController] });
  });

  beforeEach(async () => {
    await truncateAll(t.prisma);
    t.mail.clear();
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('registration', () => {
    it('creates a user, returns tokens and sends a verification e-mail', async () => {
      const response = await t
        .http()
        .post('/api/v1/auth/register')
        .send({ email: '  Reader@Example.KG ', password: 'Secret123', firstName: ' Айгерим ' })
        .expect(201);

      const { user, accessToken, accessTokenExpiresAt } = response.body.data;
      expect(user).toEqual({
        id: expect.any(String),
        email: 'reader@example.kg',
        firstName: 'Айгерим',
        lastName: null,
        phone: null,
        avatarKey: null,
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: false,
        createdAt: expect.any(String),
      });
      expect(user).not.toHaveProperty('passwordHash');
      expect(accessToken).toEqual(expect.any(String));
      expect(new Date(accessTokenExpiresAt).getTime()).toBeGreaterThan(Date.now());

      const cookie = rawRefreshCookie(response)!;
      expect(cookie).toMatch(/^oku_refresh=[A-Za-z0-9_-]{43};/);
      expect(cookie).toContain('Path=/api/v1/auth');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');

      expect(t.mail.to('reader@example.kg')).toHaveLength(1);
      expect(t.mail.to('reader@example.kg')[0].text).toContain(
        'http://frontend.test/ru/verify-email?token=',
      );

      const stored = await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    });

    it('rejects a duplicate e-mail regardless of case', async () => {
      await registerUser(t, { email: 'reader@example.kg' });

      const response = await t
        .http()
        .post('/api/v1/auth/register')
        .send({ email: 'READER@example.kg', password: 'Secret123' })
        .expect(409);
      expect(response.body.message).toBe('Email is already registered');
    });

    it('validates input', async () => {
      const response = await t
        .http()
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          { field: 'email', errors: ['email must be a valid e-mail address'] },
          {
            field: 'password',
            errors: expect.arrayContaining([
              'password must be at least 8 characters long',
              'password must contain at least one digit',
            ]),
          },
        ]),
      );
    });

    it('does not allow choosing a role', async () => {
      const response = await t
        .http()
        .post('/api/v1/auth/register')
        .send({ email: 'hacker@example.kg', password: 'Secret123', role: 'ADMIN' })
        .expect(400);

      expect(response.body.details).toEqual([
        { field: 'role', errors: ['property role should not exist'] },
      ]);
      await expect(t.prisma.user.count()).resolves.toBe(0);
    });

    it('rejects passwords longer than 72 bytes (bcrypt limit)', async () => {
      await t
        .http()
        .post('/api/v1/auth/register')
        .send({ email: 'long@example.kg', password: `1${'ж'.repeat(40)}` })
        .expect(400);
    });
  });

  describe('login', () => {
    it('logs in with correct credentials', async () => {
      const user = await registerUser(t);

      const response = await t
        .http()
        .post('/api/v1/auth/login')
        .send({ email: user.email.toUpperCase(), password: user.password })
        .expect(200);

      expect(response.body.data.user.email).toBe(user.email);
      expect(refreshCookieFrom(response)).toMatch(/^oku_refresh=.+/);
    });

    it('returns the same error for a wrong password and an unknown e-mail', async () => {
      const user = await registerUser(t);

      const wrongPassword = await t
        .http()
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'Wrong1234' })
        .expect(401);
      const unknownEmail = await t
        .http()
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.kg', password: 'Wrong1234' })
        .expect(401);

      expect(wrongPassword.body.message).toBe('Invalid email or password');
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
    });

    it('locks the account after 5 failed attempts', async () => {
      const user = await registerUser(t);
      const attempt = (password: string) =>
        t.http().post('/api/v1/auth/login').send({ email: user.email, password });

      for (let i = 0; i < 5; i++) {
        await attempt('Wrong1234').expect(401);
      }

      const locked = await attempt(user.password).expect(429);
      expect(locked.body.message).toBe('Too many failed login attempts. Try again later.');

      // Блокировка истекла — вход снова работает, счётчик сбрасывается
      await t.prisma.user.update({
        where: { id: user.id },
        data: { lockedUntil: new Date(Date.now() - 1000) },
      });
      await attempt(user.password).expect(200);
      await expect(
        t.prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
    });

    it('resets the failure counter after a successful login', async () => {
      const user = await registerUser(t);
      for (let i = 0; i < 3; i++) {
        await t
          .http()
          .post('/api/v1/auth/login')
          .send({ email: user.email, password: 'Wrong1234' })
          .expect(401);
      }

      await login(t, user.email, user.password);

      await expect(
        t.prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({ failedLoginAttempts: 0 });
    });

    it('does not let blocked or deleted users in', async () => {
      const banned = await registerUser(t);
      const deleted = await registerUser(t);
      await t.prisma.user.update({ where: { id: banned.id }, data: { status: 'BANNED' } });
      await t.prisma.user.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });

      const response = await t
        .http()
        .post('/api/v1/auth/login')
        .send({ email: banned.email, password: banned.password })
        .expect(403);
      expect(response.body.message).toBe('Account is blocked');

      await t
        .http()
        .post('/api/v1/auth/login')
        .send({ email: deleted.email, password: deleted.password })
        .expect(401);
    });
  });

  describe('access token', () => {
    it('is required for protected routes', async () => {
      const response = await t.http().get('/api/v1/users/me').expect(401);
      expect(response.body.message).toBe('Authentication required');

      await t.http().get('/api/v1/cart').expect(401);
      await t.http().get('/api/v1/orders').expect(401);
      await t.http().get('/api/v1/users/me').set(bearer('garbage')).expect(401);
    });

    it('opens protected routes', async () => {
      const user = await registerUser(t);
      const response = await t
        .http()
        .get('/api/v1/users/me')
        .set(bearer(user.accessToken))
        .expect(200);
      expect(response.body.data.email).toBe(user.email);
    });

    it('keeps public routes open', async () => {
      await t.http().get('/api/v1/health').expect(200);
      await t.http().get('/api/v1/categories').expect(200);
    });

    it('stops working as soon as the user is blocked', async () => {
      const user = await registerUser(t);
      await t.prisma.user.update({ where: { id: user.id }, data: { status: 'BANNED' } });

      await t.http().get('/api/v1/users/me').set(bearer(user.accessToken)).expect(401);
    });
  });

  describe('roles', () => {
    it('allows admin-only routes only for admins', async () => {
      const user = await registerUser(t);
      const admin = await registerUser(t);
      await t.prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });

      await t.http().get('/api/v1/test-admin-probe').expect(401);
      const forbidden = await t
        .http()
        .get('/api/v1/test-admin-probe')
        .set(bearer(user.accessToken))
        .expect(403);
      expect(forbidden.body.message).toBe('Insufficient permissions');

      // Роль читается из БД при каждом запросе — новый токен не нужен
      await t.http().get('/api/v1/test-admin-probe').set(bearer(admin.accessToken)).expect(200);
    });
  });

  describe('refresh tokens', () => {
    it('issues a new access token and rotates the refresh token', async () => {
      const user = await registerUser(t);

      const response = await t
        .http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(200);

      const newCookie = refreshCookieFrom(response)!;
      expect(newCookie).not.toBe(user.refreshCookie);
      expect(response.body.data.user.id).toBe(user.id);

      await t
        .http()
        .get('/api/v1/users/me')
        .set(bearer(response.body.data.accessToken))
        .expect(200);
      // Старый access-токен привязан к старой (отозванной) сессии
      await t.http().get('/api/v1/users/me').set(bearer(user.accessToken)).expect(401);
    });

    it('requires the cookie', async () => {
      const response = await t.http().post('/api/v1/auth/refresh').expect(401);
      expect(response.body.message).toBe('Refresh token is missing');
    });

    it('rejects an unknown token and clears the cookie', async () => {
      const response = await t
        .http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'oku_refresh=unknown')
        .expect(401);
      expect(rawRefreshCookie(response)).toMatch(/^oku_refresh=;/);
    });

    it('revokes all sessions when an old refresh token is reused', async () => {
      const user = await registerUser(t);
      const otherDevice = await login(t, user.email, user.password);

      const rotated = await t
        .http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(200);

      // Старый токен «украден» и предъявлен позже окна для параллельных вкладок
      await t.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: { not: null } },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });
      await t.http().post('/api/v1/auth/refresh').set('Cookie', user.refreshCookie).expect(401);

      // Все сессии пользователя отозваны, включая новую и другое устройство
      await t
        .http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookieFrom(rotated)!)
        .expect(401);
      await t
        .http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', otherDevice.refreshCookie)
        .expect(401);
      await expect(
        t.prisma.session.count({ where: { userId: user.id, revokedAt: null } }),
      ).resolves.toBe(0);
    });

    it('tolerates a parallel refresh from another tab without logging out', async () => {
      const user = await registerUser(t);

      const first = await t
        .http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(200);
      await t.http().post('/api/v1/auth/refresh').set('Cookie', user.refreshCookie).expect(401);

      await t
        .http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookieFrom(first)!)
        .expect(200);
    });

    it('rejects an expired refresh token', async () => {
      const user = await registerUser(t);
      await t.prisma.session.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await t
        .http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(401);
      expect(response.body.message).toBe('Refresh token expired');
    });
  });

  describe('logout', () => {
    it('ends the current session', async () => {
      const user = await registerUser(t);

      const response = await t
        .http()
        .post('/api/v1/auth/logout')
        .set('Cookie', user.refreshCookie)
        .expect(204);
      expect(rawRefreshCookie(response)).toMatch(/^oku_refresh=;/);

      await t.http().post('/api/v1/auth/refresh').set('Cookie', user.refreshCookie).expect(401);
      await t.http().get('/api/v1/users/me').set(bearer(user.accessToken)).expect(401);
    });

    it('is idempotent and works without a cookie', async () => {
      await t.http().post('/api/v1/auth/logout').expect(204);
    });

    it('logout-all ends every session of the user', async () => {
      const user = await registerUser(t);
      const otherDevice = await login(t, user.email, user.password);

      await t.http().post('/api/v1/auth/logout-all').set(bearer(user.accessToken)).expect(204);

      await t.http().get('/api/v1/users/me').set(bearer(otherDevice.accessToken)).expect(401);
      await t
        .http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', otherDevice.refreshCookie)
        .expect(401);
    });
  });

  describe('e-mail verification', () => {
    it('verifies the e-mail with the token from the letter', async () => {
      const user = await registerUser(t);
      const token = t.mail.lastToken(user.email);

      await t.http().post('/api/v1/auth/verify-email').send({ token }).expect(204);

      const me = await t.http().get('/api/v1/users/me').set(bearer(user.accessToken));
      expect(me.body.data.emailVerified).toBe(true);

      // Токен одноразовый
      await t.http().post('/api/v1/auth/verify-email').send({ token }).expect(400);
      // Повторная отправка не нужна
      await t
        .http()
        .post('/api/v1/auth/resend-verification')
        .set(bearer(user.accessToken))
        .expect(400);
    });

    it('rejects an invalid or expired token', async () => {
      const user = await registerUser(t);
      await t.http().post('/api/v1/auth/verify-email').send({ token: 'wrong' }).expect(400);

      await t.prisma.emailVerificationToken.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const response = await t
        .http()
        .post('/api/v1/auth/verify-email')
        .send({ token: t.mail.lastToken(user.email) })
        .expect(400);
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('resends the letter with a new token, the old one stops working', async () => {
      const user = await registerUser(t);
      const oldToken = t.mail.lastToken(user.email);

      await t
        .http()
        .post('/api/v1/auth/resend-verification')
        .set(bearer(user.accessToken))
        .expect(204);
      const newToken = t.mail.lastToken(user.email);

      expect(newToken).not.toBe(oldToken);
      await t.http().post('/api/v1/auth/verify-email').send({ token: oldToken }).expect(400);
      await t.http().post('/api/v1/auth/verify-email').send({ token: newToken }).expect(204);
    });
  });

  describe('mail language', () => {
    it('sends Kyrgyz mail to users who registered in Kyrgyz', async () => {
      await t
        .http()
        .post('/api/v1/auth/register')
        .send({ email: 'ky@example.kg', password: 'Secret123', locale: 'ky' })
        .expect(201);
      const [verify] = t.mail.to('ky@example.kg');
      expect(verify.subject).toContain('ырастаңыз');
      expect(verify.text).toContain('http://frontend.test/ky/verify-email?token=');

      t.mail.clear();
      await t
        .http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ky@example.kg' })
        .expect(204);
      expect(t.mail.to('ky@example.kg')[0].text).toContain('/ky/reset-password?token=');

      // Язык страницы, с которой запрошен сброс, важнее сохранённого
      t.mail.clear();
      await t
        .http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ky@example.kg', locale: 'ru' })
        .expect(204);
      expect(t.mail.to('ky@example.kg')[0].subject).toBe('OKU24: восстановление пароля');
    });

    it('rejects unsupported languages', async () => {
      await t
        .http()
        .post('/api/v1/auth/register')
        .send({ email: 'en@example.kg', password: 'Secret123', locale: 'en' })
        .expect(400);
    });
  });

  describe('password reset', () => {
    it('resets the password and ends all sessions', async () => {
      const user = await registerUser(t);
      t.mail.clear();

      await t.http().post('/api/v1/auth/forgot-password').send({ email: user.email }).expect(204);
      const mail = t.mail.to(user.email);
      expect(mail).toHaveLength(1);
      expect(mail[0].text).toContain('http://frontend.test/ru/reset-password?token=');

      await t
        .http()
        .post('/api/v1/auth/reset-password')
        .send({ token: t.mail.lastToken(user.email), password: 'NewSecret456' })
        .expect(204);

      await t.http().get('/api/v1/users/me').set(bearer(user.accessToken)).expect(401);
      await t
        .http()
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(401);
      await login(t, user.email, 'NewSecret456');

      // Токен одноразовый
      await t
        .http()
        .post('/api/v1/auth/reset-password')
        .send({ token: t.mail.lastToken(user.email), password: 'Another789' })
        .expect(400);
    });

    it('responds the same way for unknown e-mails and sends nothing', async () => {
      await t
        .http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@example.kg' })
        .expect(204);
      expect(t.mail.messages).toHaveLength(0);
    });

    it('unlocks a locked account', async () => {
      const user = await registerUser(t);
      await t.prisma.user.update({
        where: { id: user.id },
        data: { lockedUntil: new Date(Date.now() + 60 * 60 * 1000), failedLoginAttempts: 0 },
      });

      await t.http().post('/api/v1/auth/forgot-password').send({ email: user.email }).expect(204);
      await t
        .http()
        .post('/api/v1/auth/reset-password')
        .send({ token: t.mail.lastToken(user.email), password: 'NewSecret456' })
        .expect(204);

      await login(t, user.email, 'NewSecret456');
    });

    it('validates the new password', async () => {
      await t
        .http()
        .post('/api/v1/auth/reset-password')
        .send({ token: 'x', password: 'weak' })
        .expect(400);
    });
  });

  describe('rate limiting', () => {
    it('limits auth endpoints more strictly', async () => {
      const previous = process.env.AUTH_THROTTLE_LIMIT;
      process.env.AUTH_THROTTLE_LIMIT = '3';
      try {
        const statuses: number[] = [];
        for (let i = 0; i < 5; i++) {
          const response = await t
            .http()
            .post('/api/v1/auth/forgot-password')
            .send({ email: 'nobody@example.kg' });
          statuses.push(response.status);
        }
        expect(statuses).toContain(429);
      } finally {
        process.env.AUTH_THROTTLE_LIMIT = previous;
      }
    });
  });
});
