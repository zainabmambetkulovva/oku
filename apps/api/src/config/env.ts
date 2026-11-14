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
    // Служебный ключ сервера сайта (тот же, что у web). Его запросы не ограничиваются лимитом.
    // Случайная строка от 32 символов; не задан — исключений нет
    INTERNAL_API_TOKEN: z.string().min(32, 'не короче 32 символов').optional(),

    // Вход через Google (Google Cloud Console → OAuth client ID, тип «Web application»).
    // Адрес возврата: API_PUBLIC_URL + /api/v1/auth/google/callback. Не заданы — кнопка сообщит,
    // что вход через Google пока недоступен
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Почта: log — письма выводятся в лог (разработка), brevo — API Brevo, smtp — любой SMTP
    MAIL_TRANSPORT: z.enum(['log', 'brevo', 'smtp']).default('log'),
    // Ключ API Brevo (SMTP & API → API Keys). Только в переменных окружения
    BREVO_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().min(1).default('OKU24 <no-reply@oku24.local>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: booleanString.default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    // Документация API на /api/docs. По умолчанию включена везде, кроме production
    SWAGGER_ENABLED: booleanString.optional(),

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

    // Публичный адрес API — для вебхуков платёжной системы (https://api.oku24.kg)
    API_PUBLIC_URL: z.string().url().default('http://localhost:3000'),

    // Доставка, тыйын: курьер по Бишкеку и почта по Кыргызстану. Самовывоз бесплатный
    DELIVERY_PRICE_COURIER: z.coerce.number().int().min(0).default(20_000),
    DELIVERY_PRICE_POST: z.coerce.number().int().min(0).default(30_000),
    // Сколько минут ждать оплаты онлайн-заказа; потом заказ отменяется, товар возвращается
    ORDER_PAYMENT_TTL_MINUTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .default(10),
    // Email, которым разрешено назначать и снимать роли (через запятую).
    // Должны быть администраторами; остальные администраторы ролями не управляют
    ROLE_MANAGER_EMAILS: commaSeparatedList
      .transform((emails) => emails.map((email) => email.toLowerCase()))
      .default(''),
    // Порог «заканчивается на складе» для dashboard
    LOW_STOCK_THRESHOLD: z.coerce.number().int().min(0).default(3),

    // Фоновые задачи (отмена неоплаченных заказов). В тестах выключены
    JOBS_ENABLED: booleanString.default('true'),

    // Платёжная система: finik — Finik (кошелёк, QR); test — тестовый провайдер для разработки
    PAYMENT_PROVIDER: z.enum(['test', 'finik']).default('test'),
    TEST_PAYMENT_SECRET: z.string().min(1).default('test-payment-secret'),
    FINIK_ENV: z.enum(['beta', 'prod']).default('beta'),
    FINIK_API_KEY: z.string().optional(),
    FINIK_ACCOUNT_ID: z.string().optional(),
    // Закрытый RSA-ключ магазина (PEM). Публичную часть регистрируют в Finik
    FINIK_PRIVATE_KEY: z.string().optional(),
    // Публичный ключ Finik для проверки вебхуков (PEM) — из документации Finik для выбранной среды
    FINIK_PUBLIC_KEY: z.string().optional(),
    // Host, с которым Finik подписывает вебхук. По умолчанию — host из API_PUBLIC_URL
    FINIK_WEBHOOK_HOST: z.string().optional(),
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
    if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
      issue('GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET задаются вместе');
    }
    if (env.MAIL_TRANSPORT === 'brevo' && !env.BREVO_API_KEY) {
      issue('BREVO_API_KEY', 'обязателен при MAIL_TRANSPORT=brevo');
    }
    if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
      issue('SMTP_HOST', 'обязателен при MAIL_TRANSPORT=smtp');
    }

    if (env.NODE_ENV === 'production' && env.PAYMENT_PROVIDER === 'test') {
      issue('PAYMENT_PROVIDER', 'тестовый провайдер в production запрещён');
    }
    if (env.PAYMENT_PROVIDER === 'finik') {
      for (const name of [
        'FINIK_API_KEY',
        'FINIK_ACCOUNT_ID',
        'FINIK_PRIVATE_KEY',
        'FINIK_PUBLIC_KEY',
      ] as const) {
        if (!env[name]) {
          issue(name, 'обязателен при PAYMENT_PROVIDER=finik');
        }
      }
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
  })
  .transform((env) => ({
    ...env,
    SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? env.NODE_ENV !== 'production',
  }));

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
