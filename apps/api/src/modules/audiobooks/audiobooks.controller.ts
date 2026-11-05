import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CatalogQueryDto } from '../catalog/catalog-query.dto';
import { AudiobooksService } from './audiobooks.service';

@ApiTags('catalog / audiobooks')
@Public()
@Controller('audiobooks')
export class AudiobooksController {
  constructor(private readonly audiobooks: AudiobooksService) {}

  /** Каталог аудиокниг: поиск, фильтры, сортировка, пагинация. Цены — в тыйынах. */
  @Get()
  list(@Query() query: CatalogQueryDto) {
    return this.audiobooks.list(query);
  }

  /** Аудиокнига со списком глав (без доступа к файлам). */
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.audiobooks.findBySlug(slug);
  }

  @Get(':slug/similar')
  similar(@Param('slug') slug: string) {
    return this.audiobooks.similar(slug);
  }
}
