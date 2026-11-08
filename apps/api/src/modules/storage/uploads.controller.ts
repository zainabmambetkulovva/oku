import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { StorageService } from './storage.service';
import { UPLOAD_KIND_VALUES, type UploadKind } from './upload-kinds';

export class CreateUploadDto {
  /** Вид файла: определяет папку, допустимые типы и размер */
  @IsIn(UPLOAD_KIND_VALUES)
  kind: UploadKind;

  /** MIME-тип файла, например image/webp или audio/mpeg */
  @IsString()
  contentType: string;

  /** Размер файла в байтах */
  @IsInt()
  @Min(1)
  @Max(1024 * 1024 * 1024)
  size: number;
}

/**
 * Загрузка файлов администратором:
 * 1) POST /admin/uploads — подписанная форма для загрузки напрямую в хранилище;
 * 2) браузер отправляет файл на url с полями fields;
 * 3) полученный key сохраняется в товаре (обложка, изображение, глава).
 */
@ApiTags('admin / uploads')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  create(@Body() dto: CreateUploadDto) {
    return this.storage.createUpload(dto.kind, dto.contentType, dto.size);
  }
}
