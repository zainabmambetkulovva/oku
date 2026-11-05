import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BookCatalogQueryDto } from '../catalog/catalog-query.dto';
import { BooksService } from './books.service';

@ApiTags('catalog / books')
@Public()
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  /**
   * Каталог физических книг: поиск, фильтры, сортировка, пагинация.
   * Цены — в тыйынах (65000 = 650 сом).
   */
  @Get()
  list(@Query() query: BookCatalogQueryDto) {
    return this.books.list(query);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.books.findBySlug(slug);
  }

  /** Похожие книги: общие категории или тот же автор. */
  @Get(':slug/similar')
  similar(@Param('slug') slug: string) {
    return this.books.similar(slug);
  }
}
