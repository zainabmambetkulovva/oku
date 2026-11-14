import { Response } from 'supertest';
import { GOOGLE_AUTH_URL, GOOGLE_TOKEN_URL } from '../../src/modules/auth/google-auth.service';
import { createTestApp, refreshCookieFrom, registerUser, TestApp } from '../helpers/app';
import { truncateAll } from '../helpers/database';

const CLIENT_ID = 'test-client.apps.googleusercontent.com';

/** id_token в формате JWT (подпись не нужна: токен получен напрямую у Google по TLS). */
function idToken(claims: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256' })}.${encode({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: 'google-sub-1',
    email: 'reader@gmail.com',
    email_verified: true,
    given_name: 'Айбек',
    family_name: 'Садыков',
    ...claims,
  })}.signature`;
}

const cookies = (response: Response) =>
  (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];

describe('Google sign-in (e2e)', () => {
  let t: TestApp;
  const realFetch = global.fetch;
  let tokenResponse: () => globalThis.Response;
  let tokenRequests: URLSearchParams[];

  beforeAll(async () => {
    t = await createTestApp();
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (String(input) === GOOGLE_TOKEN_URL) {
        tokenRequests.push(new URLSearchParams(String(init?.body)));
        return tokenResponse();
      }
      return realFetch(input, init);
    });
  });

  beforeEach(async () => {
    await truncateAll(t.prisma);
    tokenRequests = [];
    tokenResponse = () =>
      new globalThis.Response(JSON.stringify({ id_token: idToken({}) }), { status: 200 });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await t?.app.close();
  });

  /** Начало входа: адрес Google, state и cookie потока. */
  async function start(query = 'locale=ky&next=/ky/books') {
    const response = await t.http().get(`/api/v1/auth/google?${query}`).expect(302);
    const location = new URL(response.headers.location as string);
    const flowCookie = cookies(response).find((c) => c.startsWith('oku_google='))!;
    return { location, flowCookie: flowCookie.split(';')[0], rawCookie: flowCookie };
  }

  async function callback(query: string, flowCookie?: string) {
    const request = t.http().get(`/api/v1/auth/google/callback?${query}`);
    if (flowCookie) request.set('Cookie', flowCookie);
    return request.expect(302);
  }

  it('redirects to Google with PKCE and the registered callback', async () => {
    const { location, rawCookie } = await start();
    expect(`${location.origin}${location.pathname}`).toBe(GOOGLE_AUTH_URL);
    expect(location.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(location.searchParams.get('redirect_uri')).toBe(
      'http://api.test/api/v1/auth/google/callback',
    );
    expect(location.searchParams.get('scope')).toBe('openid email profile');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('state')).toMatch(/^[\w-]{43}$/);
    expect(rawCookie).toContain('HttpOnly');
    expect(rawCookie).toContain('Path=/api/v1/auth/google');
    expect(rawCookie).toContain('SameSite=Lax');
  });

  it('creates a verified customer and signs them in', async () => {
    const { location, flowCookie } = await start();
    const state = location.searchParams.get('state')!;

    const response = await callback(`code=auth-code&state=${state}`, flowCookie);

    expect(response.headers.location).toBe(
      'http://frontend.test/ky/auth/callback?next=%2Fky%2Fbooks',
    );
    const refresh = refreshCookieFrom(response);
    expect(refresh).toMatch(/^oku_refresh=.{43}$/);

    // Код обменян с секретом и PKCE verifier, который подходит к challenge
    expect(tokenRequests).toHaveLength(1);
    expect(tokenRequests[0].get('code')).toBe('auth-code');
    expect(tokenRequests[0].get('client_secret')).toBe('test-google-secret');
    expect(tokenRequests[0].get('code_verifier')).toMatch(/^[\w-]{43}$/);
    const { createHash } = await import('node:crypto');
    expect(
      createHash('sha256').update(tokenRequests[0].get('code_verifier')!).digest('base64url'),
    ).toBe(location.searchParams.get('code_challenge'));

    const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'reader@gmail.com' } });
    expect(user).toMatchObject({
      googleId: 'google-sub-1',
      passwordHash: null,
      firstName: 'Айбек',
      lastName: 'Садыков',
      locale: 'ky',
      role: 'USER',
    });
    expect(user.emailVerifiedAt).not.toBeNull();

    // Сессия рабочая: сайт получает access-токен по cookie
    const session = await t.http().post('/api/v1/auth/refresh').set('Cookie', refresh!).expect(200);
    expect(session.body.data.user.email).toBe('reader@gmail.com');
  });

  it('links Google to an existing account with the same e-mail', async () => {
    const existing = await registerUser(t, { email: 'reader@gmail.com' });
    const { location, flowCookie } = await start('locale=ru');

    const response = await callback(
      `code=c&state=${location.searchParams.get('state')}`,
      flowCookie,
    );

    expect(response.headers.location).toBe('http://frontend.test/ru/auth/callback');
    const user = await t.prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
    expect(user.googleId).toBe('google-sub-1');
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(await t.prisma.user.count()).toBe(1);
    // Пароль продолжает работать
    await t
      .http()
      .post('/api/v1/auth/login')
      .send({ email: existing.email, password: existing.password })
      .expect(200);
  });

  it('rejects a forged state and does not sign in', async () => {
    const { flowCookie } = await start();
    const response = await callback('code=c&state=forged', flowCookie);
    expect(response.headers.location).toBe('http://frontend.test/ky/login?error=google_failed');
    expect(refreshCookieFrom(response)).toBeUndefined();
    expect(tokenRequests).toHaveLength(0);
  });

  it('rejects a callback without the flow cookie', async () => {
    const { location } = await start();
    const response = await callback(`code=c&state=${location.searchParams.get('state')}`);
    expect(response.headers.location).toBe('http://frontend.test/ru/login?error=google_failed');
    expect(await t.prisma.user.count()).toBe(0);
  });

  it('reports a cancelled sign-in', async () => {
    const { location, flowCookie } = await start();
    const response = await callback(
      `error=access_denied&state=${location.searchParams.get('state')}`,
      flowCookie,
    );
    expect(response.headers.location).toBe('http://frontend.test/ky/login?error=google_cancelled');
  });

  it.each([
    ['an unverified e-mail', { email_verified: false }],
    ['another audience', { aud: 'someone-else.apps.googleusercontent.com' }],
    ['another issuer', { iss: 'https://evil.example' }],
    ['an expired token', { exp: Math.floor(Date.now() / 1000) - 10 }],
  ])('rejects %s', async (_name, claims) => {
    tokenResponse = () =>
      new globalThis.Response(JSON.stringify({ id_token: idToken(claims) }), { status: 200 });
    const { location, flowCookie } = await start();
    const response = await callback(
      `code=c&state=${location.searchParams.get('state')}`,
      flowCookie,
    );
    expect(response.headers.location).toBe('http://frontend.test/ky/login?error=google_failed');
    expect(await t.prisma.user.count()).toBe(0);
  });

  it('rejects a failed code exchange', async () => {
    tokenResponse = () =>
      new globalThis.Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
    const { location, flowCookie } = await start();
    const response = await callback(
      `code=c&state=${location.searchParams.get('state')}`,
      flowCookie,
    );
    expect(response.headers.location).toBe('http://frontend.test/ky/login?error=google_failed');
  });

  it('does not let blocked users in', async () => {
    const user = await registerUser(t, { email: 'reader@gmail.com' });
    await t.prisma.user.update({ where: { id: user.id }, data: { status: 'BANNED' } });
    const { location, flowCookie } = await start();
    const response = await callback(
      `code=c&state=${location.searchParams.get('state')}`,
      flowCookie,
    );
    expect(response.headers.location).toBe('http://frontend.test/ky/login?error=google_blocked');
    expect(refreshCookieFrom(response)).toBeUndefined();
  });

  it('ignores redirects to other sites', async () => {
    for (const next of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
      const { location, flowCookie } = await start(`locale=ru&next=${encodeURIComponent(next)}`);
      const response = await callback(
        `code=c&state=${location.searchParams.get('state')}`,
        flowCookie,
      );
      expect(response.headers.location).toBe('http://frontend.test/ru/auth/callback');
    }
  });
});
