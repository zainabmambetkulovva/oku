import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination';
import { Trim } from '../../../common/validation/decorators';
import { SITE_LOCALES, type SiteLocale } from '../../auth/auth.constants';

export class TodayQuoteQueryDto {
  @IsOptional()
  @IsIn(SITE_LOCALES)
  locale?: SiteLocale;
}

export class CreateQuoteDto {
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(600)
  text: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  author: string;

  /** Название книги, если цитата из книги */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  source?: string;

  /** Книга из каталога — на неё будет ссылка */
  @IsOptional()
  @IsUUID()
  bookId?: string;

  @IsIn(SITE_LOCALES)
  locale: SiteLocale;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}

export class AdminQuotesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SITE_LOCALES)
  locale?: SiteLocale;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;
}
