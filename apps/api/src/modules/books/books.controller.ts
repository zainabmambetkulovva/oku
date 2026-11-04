import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { BooksService } from './books.service';
import { CategoriesService } from '../categories/categories.service';

@Public()
@Controller('books')
export class BooksController {
  constructor(
    private booksService: BooksService,
    private categoriesService: CategoriesService,
  ) {}

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
    // findOne сам выбрасывает NotFoundException, если категории нет
    const category = await this.categoriesService.findOne(slug);
    return this.booksService.findAll(1, 10, category.id);
  }
}
