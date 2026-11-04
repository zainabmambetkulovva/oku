import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Response } from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { MailService } from '../../src/modules/mail/mail.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MailCollector } from './mail-collector';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  mail: MailCollector;
  http: () => ReturnType<typeof request>;
}

/** Приложение с той же конфигурацией, что в production, но с почтой в памяти. */
export async function createTestApp(options: { controllers?: Type[] } = {}): Promise<TestApp> {
  const mail = new MailCollector();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();

  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    mail,
    http: () => request(app.getHttpServer()),
  };
}

/** "oku_refresh=<token>" из Set-Cookie, либо undefined. Пустое значение — cookie очищена. */
export function refreshCookieFrom(response: Response): string | undefined {
  const raw = response.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((cookie) => cookie.startsWith('oku_refresh='))?.split(';')[0];
}

export function rawRefreshCookie(response: Response): string | undefined {
  const raw = response.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((cookie) => cookie.startsWith('oku_refresh='));
}

let counter = 0;

export interface RegisteredUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshCookie: string;
}

export async function registerUser(
  t: TestApp,
  overrides: { email?: string; password?: string } = {},
): Promise<RegisteredUser> {
  const email = overrides.email ?? `reader-${Date.now()}-${++counter}@test.local`;
  const password = overrides.password ?? 'Secret123';

  const response = await t
    .http()
    .post('/api/v1/auth/register')
    .send({ email, password, firstName: 'Test' })
    .expect(201);

  return {
    id: response.body.data.user.id,
    email,
    password,
    accessToken: response.body.data.accessToken,
    refreshCookie: refreshCookieFrom(response)!,
  };
}

export async function login(t: TestApp, email: string, password: string) {
  const response = await t.http().post('/api/v1/auth/login').send({ email, password }).expect(200);
  return {
    accessToken: response.body.data.accessToken as string,
    refreshCookie: refreshCookieFrom(response)!,
  };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
