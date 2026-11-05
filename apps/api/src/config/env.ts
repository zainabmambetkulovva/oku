import { z } from 'zod';

/**
 * Переменные окружения backend. Проверяются при старте приложения:
 * при ошибке приложение не запускается и выводит список проблем.
 * Описание переменных — docs/deployment.md.
 */
const commaSeparatedList = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),

    // Access-токен (JWT) — короткоживущий, передаётся в заголовке Authorization
    JWT_SECRET: z.string().min(1),
    JWT_ACCESS_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/, 'формат: число и единица s|m|h|d, например 15m')
      .default('15m'),
    // Refresh-токен — в httpOnly cookie, хранится в таблице sessions в виде хеша
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    COOKIE_SECURE: booleanString.default('false'),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

    // Адрес frontend — для ссылок в письмах (подтверждение почты, сброс пароля)
    FRONTEND_URL: z.string().url().default('http://localhost:3001'),

    // Адреса frontend, которым разрешены запросы к API (через запятую)
    CORS_ORIGINS: commaSeparatedList.default('http://localhost:3001'),

    // Ограничение частоты запросов: не больше THROTTLE_LIMIT за THROTTLE_TTL_MS
    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
    // Более строгий лимит для входа, регистрации и восстановления пароля
    AUTH_THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(10),

    // Почта: log — письма выводятся в лог (разработка), smtp — отправка через SMTP
    MAIL_TRANSPORT: z.enum(['log', 'smtp']).default('log'),
    MAIL_FROM: z.string().min(1).default('OKU_24 <no-reply@oku24.local>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: booleanString.default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    SWAGGER_ENABLED: booleanString.default('true'),

    // S3-совместимое хранилище. Два бакета: публичный (обложки, за CDN) и закрытый (аудио).
    // S3_ENDPOINT пустой — AWS S3; для R2, Yandex, SeaweedFS и т.п. — адрес сервиса.
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_BUCKET: z.string().optional(),
    S3_PRIVATE_BUCKET: z.string().optional(),
    S3_FORCE_PATH_STYLE: booleanString.default('false'),
    // Создавать бакеты при старте, если их нет (только для разработки)
    S3_CREATE_BUCKETS: booleanString.default('false'),
    // Адрес, по которому браузер получает файлы публичного бакета (CDN)
    MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),

    // Redis для кэша каталога. Не задан — кэш отключён
    REDIS_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (env.NODE_ENV === 'production') {
      if (env.JWT_SECRET.length < 32) {
        issue('JWT_SECRET', 'в production должен быть не короче 32 символов');
      }
      if (!env.COOKIE_SECURE) {
        issue('COOKIE_SECURE', 'в production должен быть true (cookie только по HTTPS)');
      }
    }
    if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
      issue('COOKIE_SAMESITE', 'значение none требует COOKIE_SECURE=true');
    }
    if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
      issue('SMTP_HOST', 'обязателен при MAIL_TRANSPORT=smtp');
    }

    const storageVars = [
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'S3_PUBLIC_BUCKET',
      'S3_PRIVATE_BUCKET',
      'MEDIA_PUBLIC_BASE_URL',
    ] as const;
    if (storageVars.some((name) => env[name])) {
      for (const name of storageVars) {
        if (!env[name]) {
          issue(name, 'обязателен, если настроено файловое хранилище (S3_*)');
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  // Пустая строка в .env (например, S3_ENDPOINT=) означает «не задано»
  const cleaned = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value === '' ? undefined : value]),
  );
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Некорректные переменные окружения:\n${problems}`);
  }
  return result.data;
}
