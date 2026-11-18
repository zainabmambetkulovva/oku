import { validateEnv } from './env';

/**
 * Проверка окружения до загрузки модуля приложения. Подключается в main.ts первым
 * импортом: если настройки неверны, ошибка сохраняется, а модуль приложения
 * (см. app.module.ts) не падает при загрузке — main.ts отвечает 503 и
 * показывает на /health, что исправить.
 *
 * Модуль приложения импортируется в main.ts статически, чтобы сборка Vercel видела
 * все его зависимости (через import() она их не находит).
 */
export const envError: Error | null = (() => {
  try {
    validateEnv(process.env);
    return null;
  } catch (error) {
    return error as Error;
  }
})();

(globalThis as { __okuEnvError?: Error | null }).__okuEnvError = envError;
