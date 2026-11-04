import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [PrismaModule, CategoriesModule],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
