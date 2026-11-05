import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Response } from 'supertest';
import { AppModule } from '../../src/app.module';
import { CacheService } from '../../src/modules/cache/cache.service';
import { UploadKind } from '../../src/modules/storage/upload-kinds';
import { configureApp } from '../../src/app.setup';
import { MailService } from '../../src/modules/mail/mail.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { truncateAll } from './database';
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

/** Чистая база, пустой кэш каталога и почта — перед каждым тестом. */
export async function resetState(t: TestApp): Promise<void> {
  await truncateAll(t.prisma);
  await t.app.get(CacheService).invalidateCatalog();
  t.mail.clear();
}

export async function createAdmin(t: TestApp): Promise<RegisteredUser> {
  const admin = await registerUser(t);
  await t.prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
  return admin;
}

/**
 * Загрузка файла так, как это делает админка: подписанная форма от API,
 * затем POST файла напрямую в хранилище. Возвращает ключ файла.
 */
export async function uploadFile(
  t: TestApp,
  token: string,
  kind: UploadKind,
  options: { contentType?: string; bytes?: number; declaredSize?: number } = {},
): Promise<string> {
  const contentType = options.contentType ?? 'image/png';
  const bytes = options.bytes ?? 128;
  const declaredSize = options.declaredSize ?? bytes;
  const response = await t
    .http()
    .post('/api/v1/admin/uploads')
    .set(bearer(token))
    .send({ kind, contentType, size: declaredSize })
    .expect(201);
  const { url, fields, key } = response.body.data as {
    url: string;
    fields: Record<string, string>;
    key: string;
  };

  const status = await postToStorage(url, fields, contentType, bytes);
  if (status >= 300) {
    throw new Error(`Upload to storage failed with status ${status}`);
  }
  return key;
}

export async function postToStorage(
  url: string,
  fields: Record<string, string>,
  contentType: string,
  bytes: number,
): Promise<number> {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.append(name, value);
  }
  form.append('file', new Blob([Buffer.alloc(bytes, 7)], { type: contentType }), 'file');
  const response = await fetch(url, { method: 'POST', body: form });
  return response.status;
}
