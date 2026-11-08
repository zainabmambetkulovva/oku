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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminProductQueryDto } from '../catalog/catalog-query.dto';
import { AdminBooksService } from './admin-books.service';
import { AddBookImageDto, CreateBookDto, ProductStatusDto, UpdateBookDto } from './dto/book.dto';

@ApiTags('admin / books')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/books')
export class AdminBooksController {
  constructor(private readonly books: AdminBooksService) {}

  /** Все книги, включая черновики и архив. */
  @Get()
  list(@Query() query: AdminProductQueryDto) {
    return this.books.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.books.get(id);
  }

  /** Создание книги (черновиком). Цена — в тыйынах. */
  @Post()
  create(@Body() dto: CreateBookDto, @AuthUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.books.create(dto, { id: user.id, ip });
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.books.update(id, dto, { id: user.id, ip });
  }

  /** Публикация (ACTIVE), снятие с публикации (DRAFT) или с продажи (ARCHIVED). */
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductStatusDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.books.setStatus(id, dto.status, { id: user.id, ip });
  }

  /** Удаление. Книгу, которая была в заказах, удалить нельзя (409) — только в архив. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.books.remove(id, { id: user.id, ip });
  }

  @Post(':id/images')
  addImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddBookImageDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.books.addImage(id, dto, { id: user.id, ip });
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.books.removeImage(id, imageId, { id: user.id, ip });
  }
}
