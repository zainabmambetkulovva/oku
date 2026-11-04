import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';

@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.booksService.findAll(page, limit, categoryId);
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    return this.booksService.findOne(slug);
  }

  @Get('category/:slug')
  async findByCategory(@Param('slug') slug: string) {
    const category = await this.booksService['categoriesService']?.findOne(slug);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.booksService.findAll(1, 10, category.id);
  }
}
