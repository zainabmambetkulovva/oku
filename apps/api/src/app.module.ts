import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DomainEventsModule } from './common/events/events.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { Env, validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { AuditModule } from './modules/audit/audit.module';
import { CacheModule } from './modules/cache/cache.module';
import { StorageModule } from './modules/storage/storage.module';
import { AudiobooksModule } from './modules/audiobooks/audiobooks.module';
import { ListeningModule } from './modules/listening/listening.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { BooksModule } from './modules/books/books.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';

// Модули admin и analytics подключаются на этапе Б8.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
          limit: config.get('THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    DomainEventsModule,
    PrismaModule,
    MailModule,
    CacheModule,
    StorageModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    BooksModule,
    AudiobooksModule,
    ListeningModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    FavoritesModule,
    ReviewsModule,
    NotificationsModule,
    NewsletterModule,
  ],
  providers: [
    // Порядок важен: лимит запросов → проверка токена → проверка роли.
    // Все маршруты закрыты по умолчанию, открытые помечены @Public().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule {}
