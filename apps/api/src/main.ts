import { envError, onLoadError } from './config/preflight';
import './vercel-deps';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { createServer } from 'http';
import { SWAGGER_PATH, configureApp } from './app.setup';
import { Env } from './config/env';
import { configErrorHandler, startupErrorHandler } from './config/config-error';

/**
 * Настройки окружения неверны: вместо падения (на Vercel — FUNCTION_INVOCATION_FAILED
 * без объяснений) отвечаем 503, а /api/v1/health называет переменные, которые нужно
 * исправить. Значения переменных никогда не выводятся.
 */
function serveUnavailable(handler: ReturnType<typeof configErrorHandler>) {
  const port = Number(process.env.PORT) || 3000;
  createServer(handler).listen(port);
}

async function bootstrap() {
  // Модули загружены — дальше ошибки обрабатываются ниже
  process.removeListener('uncaughtException', onLoadError);
  if (envError) {
    Logger.error(envError.message, 'Bootstrap');
    serveUnavailable(configErrorHandler(envError.message));
    return;
  }
  try {
    await start();
  } catch (error) {
    // Полный текст — только в логах хостинга
    Logger.error((error as Error)?.stack ?? String(error), 'Bootstrap');
    serveUnavailable(startupErrorHandler(error));
  }
}

async function start() {
  // Модуль приложения подключается здесь, а не статическим импортом: если хостинг
  // не положил какой-то пакет, ошибка попадёт в обработчик ниже и /health назовёт его
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, { abortOnError: false });
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
