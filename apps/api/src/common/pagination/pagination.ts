import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiResponse } from '../http/api-response';

export const MAX_PAGE_SIZE = 50;

/** page и limit из query-строки. По умолчанию — первая страница по 20 записей. */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  page: number = 1;

  /** Не больше 50 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = 20;
}

export function paginated<T>(
  data: T[],
  total: number,
  { page, limit }: { page: number; limit: number },
): Required<ApiResponse<T[]>> {
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export const skipFor = ({ page, limit }: { page: number; limit: number }) => (page - 1) * limit;
