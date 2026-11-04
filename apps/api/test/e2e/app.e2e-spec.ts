import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

describe('Application (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/health reports the app and database are up', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toEqual({
      data: { status: 'ok', database: 'up', uptimeSeconds: expect.any(Number) },
    });
  });

  it('serves routes only under the versioned prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
    await request(app.getHttpServer()).get('/api/health').expect(404);
  });

  it('returns errors in the unified format', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Cannot GET /api/v1/does-not-exist',
      path: '/api/v1/does-not-exist',
      timestamp: expect.any(String),
    });
  });

  it('sets security headers', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  // CORS_ORIGINS задаётся в test/helpers/setup-env.ts
  it('allows CORS only for configured origins', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://allowed.test');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.test');

    const denied = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://evil.test');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('publishes Swagger documentation', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    expect(response.body.info.title).toBe('OKU_24 API');
    expect(Object.keys(response.body.paths)).toContain('/api/v1/health');
  });
});
