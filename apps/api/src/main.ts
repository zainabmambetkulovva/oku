import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { createServer } from 'http';
import { SWAGGER_PATH, configureApp } from './app.setup';
import { Env, validateEnv } from './config/env';
import { configErrorHandler } from './config/config-error';

/**
 * Настройки окружения неверны: вместо падения (на Vercel — FUNCTION_INVOCATION_FAILED
 * без объяснений) отвечаем 503, а /api/v1/health называет переменные, которые нужно
 * исправить. Значения переменных никогда не выводятся.
 */
function serveConfigError(error: Error) {
  Logger.error(error.message, 'Bootstrap');
  const port = Number(process.env.PORT) || 3000;
  createServer(configErrorHandler(error.message)).listen(port);
}

async function bootstrap() {
  try {
    validateEnv(process.env);
  } catch (error) {
    serveConfigError(error as Error);
    return;
  }

  // Модуль приложения проверяет окружение уже при загрузке, поэтому подключается после проверки
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  Logger.log(`Application is running on: http://localhost:${port}/api/v1`, 'Bootstrap');
  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    Logger.log(`Swagger documentation: http://localhost:${port}/${SWAGGER_PATH}`, 'Bootstrap');
  }
}

void bootstrap();
