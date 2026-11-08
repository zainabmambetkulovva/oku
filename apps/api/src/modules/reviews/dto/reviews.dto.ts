import { PartialType } from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination';
import { Trim } from '../../../common/validation/decorators';

export class CreateReviewDto {
  /** Оценка от 1 до 5 */
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  text?: string | null;
}

export class UpdateReviewDto extends PartialType(CreateReviewDto) {}

export const REVIEW_SORTS = ['newest', 'rating_desc', 'rating_asc'] as const;

export class ReviewsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(REVIEW_SORTS)
  sort: (typeof REVIEW_SORTS)[number] = 'newest';
}

export class AdminReviewsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(ReviewStatus))
  status?: ReviewStatus;

  @IsOptional()
  @IsIn(['book', 'audiobook'])
  productType?: 'book' | 'audiobook';
}

export class ModerateReviewDto {
  /** REJECTED — скрыть отзыв, APPROVED — снова показать */
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';
}

export class LatestReviewsQueryDto {
  /** Сколько последних отзывов вернуть (1–12) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  limit: number = 6;
}
