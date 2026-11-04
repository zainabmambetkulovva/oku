/** Имя cookie с refresh-токеном. */
export const REFRESH_COOKIE_NAME = 'oku_refresh';
/** Cookie отправляется браузером только на маршруты авторизации. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Блокировка входа после MAX_FAILED_LOGIN_ATTEMPTS неудачных попыток подряд. */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MINUTES = 15;

export const EMAIL_VERIFICATION_TTL_HOURS = 24;
export const PASSWORD_RESET_TTL_MINUTES = 60;

/**
 * Повторное использование отозванного refresh-токена считается кражей и отзывает
 * все сессии пользователя. Исключение — первые секунды после ротации: так
 * параллельные запросы из нескольких вкладок не разлогинивают пользователя.
 */
export const REFRESH_REUSE_GRACE_MS = 10_000;

export const BCRYPT_ROUNDS = 12;
