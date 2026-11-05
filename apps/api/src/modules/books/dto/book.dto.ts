import { PartialType } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsISBN,
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
import { LANGUAGES, Language, MAX_PRICE } from '../../catalog/catalog.constants';

export class CreateBookDto {
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

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  /** Ключ из POST /admin/uploads (kind: book-cover) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverKey?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  publisher?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  publicationYear?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20_000)
  pages?: number | null;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: Language | null;

  @IsOptional()
  @Trim()
  @IsISBN()
  isbn?: string | null;

  /** Цена в тыйынах: 650 сом = 65000 */
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stockQuantity?: number;

  /** Категории книги — полностью заменяют текущие */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  categoryIds?: string[];
}

export class UpdateBookDto extends PartialType(CreateBookDto) {}

export class ProductStatusDto {
  /** DRAFT — черновик, ACTIVE — опубликован, ARCHIVED — снят с продажи */
  @IsIn(Object.values(ProductStatus))
  status: ProductStatus;
}

export class AddBookImageDto {
  /** Ключ из POST /admin/uploads (kind: book-image) */
  @IsString()
  @MaxLength(500)
  storageKey: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}
