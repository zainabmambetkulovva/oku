import { createTestApp, TestApp } from '../helpers/app';

describe('Application (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t?.app.close();
  });

  it('GET /api/v1/health reports the app and database are up', async () => {
    const response = await t.http().get('/api/v1/health').expect(200);

    expect(response.body).toEqual({
      data: { status: 'ok', database: 'up', uptimeSeconds: expect.any(Number) },
    });
  });

  it('serves routes only under the versioned prefix', async () => {
    await t.http().get('/health').expect(404);
    await t.http().get('/api/health').expect(404);
  });

  it('returns errors in the unified format', async () => {
    const response = await t.http().get('/api/v1/does-not-exist').expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Cannot GET /api/v1/does-not-exist',
      path: '/api/v1/does-not-exist',
      timestamp: expect.any(String),
    });
  });

  it('sets security headers', async () => {
    const response = await t.http().get('/api/v1/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  // CORS_ORIGINS задаётся в test/helpers/setup-env.ts
  it('allows CORS only for configured origins', async () => {
    const allowed = await t.http().get('/api/v1/health').set('Origin', 'http://allowed.test');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.test');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const denied = await t.http().get('/api/v1/health').set('Origin', 'http://evil.test');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('publishes Swagger documentation', async () => {
    const response = await t.http().get('/api/docs-json').expect(200);

    expect(response.body.info.title).toBe('OKU_24 API');
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining(['/api/v1/health', '/api/v1/auth/login', '/api/v1/users/me']),
    );
  });
});
