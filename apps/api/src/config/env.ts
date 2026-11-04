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

    JWT_SECRET: z.string().min(1),
    JWT_EXPIRES_IN: z.string().min(1).default('7d'),

    // Адреса frontend, которым разрешены запросы к API (через запятую)
    CORS_ORIGINS: commaSeparatedList.default('http://localhost:3001'),

    // Ограничение частоты запросов: не больше THROTTLE_LIMIT за THROTTLE_TTL_MS
    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

    SWAGGER_ENABLED: booleanString.default('true'),

    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'в production должен быть не короче 32 символов',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Некорректные переменные окружения:\n${problems}`);
  }
  return result.data;
}
