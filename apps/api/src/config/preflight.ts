import { createServer } from 'http';
import { startupErrorHandler } from './config-error';
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

/**
 * Ошибка при загрузке модулей (например, сборка хостинга не положила пакет) случается
 * до запуска main.ts и обычно просто убивает процесс. Пока модули грузятся, такую
 * ошибку ловим и отвечаем 503: /api/v1/health покажет имя недостающего модуля.
 * main.ts снимает этот обработчик, как только загрузка закончилась.
 */
export function onLoadError(error: Error) {
  // eslint-disable-next-line no-console
  console.error('Startup failed while loading modules', error);
  createServer(startupErrorHandler(error)).listen(Number(process.env.PORT) || 3000);
}
process.once('uncaughtException', onLoadError);
