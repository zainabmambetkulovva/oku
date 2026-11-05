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

// Файловое хранилище и Redis — локальные (docker compose) или сервисы CI.
// Значения по умолчанию совпадают с docker/docker-compose.yml.
process.env.S3_ENDPOINT ??= 'http://localhost:8333';
process.env.S3_REGION ??= 'us-east-1';
process.env.S3_ACCESS_KEY_ID ??= 'oku-s3-key';
process.env.S3_SECRET_ACCESS_KEY ??= 'oku-s3-secret';
process.env.S3_PUBLIC_BUCKET ??= 'oku-24-public';
process.env.S3_PRIVATE_BUCKET ??= 'oku-24-private';
process.env.S3_FORCE_PATH_STYLE = 'true';
process.env.S3_CREATE_BUCKETS = 'true';
process.env.MEDIA_PUBLIC_BASE_URL ??= `${process.env.S3_ENDPOINT}/${process.env.S3_PUBLIC_BUCKET}`;
process.env.REDIS_URL ??= 'redis://localhost:6379';

// Платежи — тестовый провайдер; фоновые задачи выключены (тесты вызывают их явно)
process.env.PAYMENT_PROVIDER = 'test';
process.env.TEST_PAYMENT_SECRET = 'test-payment-secret';
process.env.JOBS_ENABLED = 'false';
process.env.ORDER_PAYMENT_TTL_MINUTES = '10';
