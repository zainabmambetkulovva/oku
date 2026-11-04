import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Env } from './config/env';

export const API_PREFIX = 'api';
export const SWAGGER_PATH = 'api/docs';

/**
 * Настройка HTTP-уровня приложения. Используется в main.ts и в e2e-тестах,
 * чтобы тесты проверяли ту же конфигурацию, что работает в production.
 * Глобальные pipe, filter, interceptor и guard подключены в AppModule.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Все маршруты: /api/v1/...
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    credentials: true,
  });

  app.enableShutdownHooks();

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('OKU_24 API')
        .setDescription('Онлайн-магазин физических книг и аудиокниг')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(SWAGGER_PATH, app, document);
  }
}
