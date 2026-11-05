import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('admin / categories')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** Все категории (включая скрытые) с количеством подкатегорий и товаров. */
  @Get()
  list() {
    return this.categories.adminList();
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @AuthUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.categories.create(dto, { id: user.id, ip });
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.categories.update(id, dto, { id: user.id, ip });
  }

  /** Удаляется только пустая категория: без подкатегорий и товаров (иначе 409). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.categories.remove(id, { id: user.id, ip });
  }
}
