import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination';
import { SLUG_PATTERN } from '../../common/utils/slug';
import { Trim } from '../../common/validation/decorators';
import { CATALOG_SORTS, CatalogSort, LANGUAGES, Language, MAX_PRICE } from './catalog.constants';
import { ProductStatus } from '@prisma/client';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Параметры публичного каталога книг и аудиокниг. */
export class CatalogQueryDto extends PaginationQueryDto {
  /** Поиск по части названия или автора */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  /** slug категории; товары подкатегорий тоже входят */
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'category must be a category slug' })
  category?: string;

  /** Минимальная цена в тыйынах */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  /** Максимальная цена в тыйынах */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: Language;

  @IsOptional()
  @IsIn(CATALOG_SORTS)
  sort: CatalogSort = 'newest';
}

export class BookCatalogQueryDto extends CatalogQueryDto {
  /** Только книги в наличии */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  inStock?: boolean;
}

/** Список товаров в админке: все статусы. */
export class AdminProductQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(Object.values(ProductStatus))
  status?: ProductStatus;
}

export { MAX_PRICE };
