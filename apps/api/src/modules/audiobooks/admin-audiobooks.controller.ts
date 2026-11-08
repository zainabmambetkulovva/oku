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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductStatusDto } from '../books/dto/book.dto';
import { AdminProductQueryDto } from '../catalog/catalog-query.dto';
import { AdminAudiobooksService } from './admin-audiobooks.service';
import {
  CreateAudiobookDto,
  CreateChapterDto,
  ReorderChaptersDto,
  UpdateAudiobookDto,
  UpdateChapterDto,
} from './dto/audiobook.dto';

@ApiTags('admin / audiobooks')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/audiobooks')
export class AdminAudiobooksController {
  constructor(private readonly audiobooks: AdminAudiobooksService) {}

  @Get()
  list(@Query() query: AdminProductQueryDto) {
    return this.audiobooks.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.audiobooks.get(id);
  }

  /** Создание аудиокниги (черновиком, без глав). Цена — в тыйынах. */
  @Post()
  create(@Body() dto: CreateAudiobookDto, @AuthUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.audiobooks.create(dto, { id: user.id, ip });
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAudiobookDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.audiobooks.update(id, dto, { id: user.id, ip });
  }

  /** Публикация требует хотя бы одной главы. */
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductStatusDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.audiobooks.setStatus(id, dto.status, { id: user.id, ip });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.audiobooks.remove(id, { id: user.id, ip });
  }

  /** Новая глава в конец списка. Длительность аудиокниги пересчитывается. */
  @Post(':id/chapters')
  addChapter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChapterDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.audiobooks.addChapter(id, dto, { id: user.id, ip });
  }

  /** Новый порядок глав — передаются id всех глав. */
  @Put(':id/chapters/order')
  reorderChapters(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderChaptersDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.audiobooks.reorderChapters(id, dto, { id: user.id, ip });
  }

  @Patch(':id/chapters/:chapterId')
  updateChapter(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() dto: UpdateChapterDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.audiobooks.updateChapter(id, chapterId, dto, { id: user.id, ip });
  }

  @Delete(':id/chapters/:chapterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeChapter(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.audiobooks.removeChapter(id, chapterId, { id: user.id, ip });
  }
}
