import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SWAGGER_PATH, configureApp } from './app.setup';
import { Env } from './config/env';

async function bootstrap() {
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
