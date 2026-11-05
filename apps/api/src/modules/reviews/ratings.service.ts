import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface Rating {
  /** Средняя оценка с точностью до десятых; null — отзывов нет */
  average: number | null;
  count: number;
}

const EMPTY: Rating = { average: null, count: 0 };

/** Рейтинг товаров по опубликованным отзывам — для карточек каталога. */
@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async forBooks(ids: string[]): Promise<Map<string, Rating>> {
    if (ids.length === 0) {
      return new Map();
    }
    const groups = await this.prisma.review.groupBy({
      by: ['bookId'],
      where: { bookId: { in: ids }, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return new Map(groups.map((g) => [g.bookId!, toRating(g._avg.rating, g._count._all)]));
  }

  async forAudiobooks(ids: string[]): Promise<Map<string, Rating>> {
    if (ids.length === 0) {
      return new Map();
    }
    const groups = await this.prisma.review.groupBy({
      by: ['audiobookId'],
      where: { audiobookId: { in: ids }, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return new Map(groups.map((g) => [g.audiobookId!, toRating(g._avg.rating, g._count._all)]));
  }

  static of(map: Map<string, Rating>, id: string): Rating {
    return map.get(id) ?? EMPTY;
  }
}

function toRating(average: number | null, count: number): Rating {
  return { average: average === null ? null : Math.round(average * 10) / 10, count };
}
