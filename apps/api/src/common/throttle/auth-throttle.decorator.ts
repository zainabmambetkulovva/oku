import { Throttle } from '@nestjs/throttler';

const fromEnv = (name: string, fallback: number) => () => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

/**
 * Строгий лимит частоты запросов для входа, регистрации и восстановления пароля.
 * Значения AUTH_THROTTLE_LIMIT / AUTH_THROTTLE_TTL_MS проверены при старте (config/env.ts)
 * и читаются при каждом запросе.
 */
export const AuthThrottle = () =>
  Throttle({
    default: {
      limit: fromEnv('AUTH_THROTTLE_LIMIT', 10),
      ttl: fromEnv('AUTH_THROTTLE_TTL_MS', 60_000),
    },
  });
