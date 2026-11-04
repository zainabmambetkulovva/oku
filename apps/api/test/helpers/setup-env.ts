/**
 * Переменные окружения для интеграционных и e2e-тестов.
 * Выполняется до импорта тестов: ConfigModule проверяет окружение уже при импорте AppModule.
 * DATABASE_URL задаётся снаружи (тестовая база, имя которой оканчивается на "_test").
 */
process.env.NODE_ENV = 'test';
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
process.env.JWT_SECRET ??= 'integration-test-secret';
process.env.CORS_ORIGINS = 'http://allowed.test';
process.env.SWAGGER_ENABLED = 'true';
process.env.FRONTEND_URL = 'http://frontend.test';
process.env.MAIL_TRANSPORT = 'log';
// Лимиты частоты запросов высокие, чтобы не мешать тестам; отдельный тест их снижает
process.env.THROTTLE_LIMIT = '100000';
process.env.AUTH_THROTTLE_LIMIT = '100000';
