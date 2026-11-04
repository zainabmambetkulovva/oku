import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BooksModule } from './modules/books/books.module';
import { AudiobooksModule } from './modules/audiobooks/audiobooks.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ListeningProgressModule } from './modules/listening-progress/listening-progress.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    AuthModule,
    UsersModule,
    BooksModule,
    AudiobooksModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    FavoritesModule,
    ReviewsModule,
    NotificationsModule,
    ListeningProgressModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
