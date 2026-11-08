import { PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../../../common/utils/slug';
import { Trim } from '../../../common/validation/decorators';
import { LANGUAGES, type Language, MAX_PRICE } from '../../catalog/catalog.constants';

export class CreateAudiobookDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  /** Не указан — создаётся из названия с транслитерацией */
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug may contain only a-z, 0-9 and single hyphens' })
  @MaxLength(SLUG_MAX_LENGTH)
  slug?: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  author: string;

  /** Диктор */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  narrator?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  /** Ключ из POST /admin/uploads (kind: audiobook-cover) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverKey?: string | null;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: Language | null;

  /** Цена в тыйынах: 450 сом = 45000. 0 — бесплатная аудиокнига */
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  price: number;

  /** Категории — полностью заменяют текущие */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  categoryIds?: string[];
}

export class UpdateAudiobookDto extends PartialType(CreateAudiobookDto) {}

export class CreateChapterDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  /** Длительность в секундах */
  @IsInt()
  @Min(1)
  @Max(24 * 60 * 60)
  durationSeconds: number;

  /** Ключ из POST /admin/uploads (kind: audio-chapter) */
  @IsString()
  @MaxLength(500)
  storageKey: string;

  /** Бесплатный фрагмент — доступен без покупки */
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;
}

export class UpdateChapterDto extends PartialType(CreateChapterDto) {}

export class ReorderChaptersDto {
  /** Все главы аудиокниги в новом порядке */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  chapterIds: string[];
}
