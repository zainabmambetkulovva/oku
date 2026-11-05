import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const MAX_LINE_QUANTITY = 99;

/** Ровно одно из bookId / audiobookId. */
export class AddCartItemDto {
  @IsOptional()
  @IsUUID()
  bookId?: string;

  @IsOptional()
  @IsUUID()
  audiobookId?: string;

  /** Для книг; аудиокнига всегда в одном экземпляре */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_LINE_QUANTITY)
  quantity?: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Max(MAX_LINE_QUANTITY)
  quantity: number;
}

/** Корзина гостя, которую frontend хранил у себя до входа. */
export class MergeCartDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  items: AddCartItemDto[];
}
