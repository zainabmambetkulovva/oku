import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
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

export class CreateCategoryDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  /** Не указан — создаётся из названия */
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug may contain only a-z, 0-9 and single hyphens' })
  @MaxLength(SLUG_MAX_LENGTH)
  slug?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  /** Ключ изображения из POST /admin/uploads (kind: category-image) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageKey?: string | null;

  /** Родительская категория. null — категория верхнего уровня */
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
