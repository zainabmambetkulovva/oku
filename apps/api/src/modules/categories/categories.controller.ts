import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query('parentId') parentId?: string) {
    return this.categoriesService.findAll(parentId ? parentId : undefined);
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    return this.categoriesService.findOne(slug);
  }

  @Get(':slug/books')
  async findWithBooks(@Param('slug') slug: string) {
    return this.categoriesService.findWithBooks(slug);
  }
}
