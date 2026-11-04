import { Controller, Get, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';

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
