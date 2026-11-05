import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('catalog / categories')
@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** Дерево активных категорий с количеством опубликованных товаров. */
  @Get()
  tree() {
    return this.categories.tree();
  }

  /** Категория с подкатегориями и родителем. Товары — GET /books?category=:slug */
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categories.findBySlug(slug);
  }
}
