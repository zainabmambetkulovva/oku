import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AdminBooksController } from './admin-books.controller';
import { AdminBooksService } from './admin-books.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [CategoriesModule, ReviewsModule],
  controllers: [BooksController, AdminBooksController],
  providers: [BooksService, AdminBooksService],
})
export class BooksModule {}
