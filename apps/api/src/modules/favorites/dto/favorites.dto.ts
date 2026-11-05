import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination';

/** Ровно одно из bookId / audiobookId. */
export class AddFavoriteDto {
  @IsOptional()
  @IsUUID()
  bookId?: string;

  @IsOptional()
  @IsUUID()
  audiobookId?: string;
}

export class FavoritesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['book', 'audiobook'])
  type?: 'book' | 'audiobook';
}
