import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { BooksModule } from './modules/books/books.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';

// Модули users, audiobooks, payments, favorites, reviews, notifications,
// listening-progress, admin, analytics подключаются по мере реализации (этапы Б3–Б8).
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    AuthModule,
    BooksModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
