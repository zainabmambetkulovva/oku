import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { stableKey } from '../../common/utils/stable-key';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CatalogQueryDto } from '../catalog/catalog-query.dto';
import {
  CATALOG_CACHE_TTL_SECONDS,
  SIMILAR_LIMIT,
  catalogOrderBy,
} from '../catalog/catalog.constants';
import { priceWhere, searchWhere } from '../catalog/catalog.mapper';
import { CategoriesService } from '../categories/categories.service';
import { RatingsService } from '../reviews/ratings.service';
import { StorageService } from '../storage/storage.service';
import { audiobookInclude, toAudiobookDetails, toAudiobookListItem } from './audiobook.mapper';

const published = { status: 'ACTIVE', deletedAt: null } satisfies Prisma.AudiobookWhereInput;

/** Публичный каталог аудиокниг: только опубликованные. */
@Injectable()
export class AudiobooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
    private readonly ratings: RatingsService,
  ) {}

  async list(query: CatalogQueryDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('minPrice must not be greater than maxPrice');
    }

    return this.cache.catalog(
      `audiobooks:list:${stableKey(query)}`,
      CATALOG_CACHE_TTL_SECONDS,
      async () => {
        const where: Prisma.AudiobookWhereInput = {
          ...published,
          ...searchWhere(query.search),
          ...priceWhere(query.minPrice, query.maxPrice),
          ...(query.language && { language: query.language }),
        };

        if (query.category) {
          const categoryIds = await this.categories.idsWithDescendants(query.category);
          where.audiobookCategories = { some: { categoryId: { in: categoryIds } } };
        }

        const [audiobooks, total] = await this.prisma.$transaction([
          this.prisma.audiobook.findMany({
            where,
            include: audiobookInclude,
            orderBy: catalogOrderBy(query.sort),
            skip: skipFor(query),
            take: query.limit,
          }),
          this.prisma.audiobook.count({ where }),
        ]);

        const ratings = await this.ratings.forAudiobooks(
          audiobooks.map((audiobook) => audiobook.id),
        );
        return paginated(
          audiobooks.map((audiobook) =>
            toAudiobookListItem(audiobook, this.storage, RatingsService.of(ratings, audiobook.id)),
          ),
          total,
          query,
        );
      },
    );
  }

  findBySlug(slug: string) {
    return this.cache.catalog(`audiobooks:slug:${slug}`, CATALOG_CACHE_TTL_SECONDS, async () => {
      const audiobook = await this.prisma.audiobook.findFirst({
        where: { ...published, slug },
        include: audiobookInclude,
      });
      if (!audiobook) {
        throw new NotFoundException(`Audiobook "${slug}" not found`);
      }
      const ratings = await this.ratings.forAudiobooks([audiobook.id]);
      return toAudiobookDetails(audiobook, this.storage, RatingsService.of(ratings, audiobook.id));
    });
  }

  similar(slug: string) {
    return this.cache.catalog(`audiobooks:similar:${slug}`, CATALOG_CACHE_TTL_SECONDS, async () => {
      const audiobook = await this.prisma.audiobook.findFirst({
        where: { ...published, slug },
        select: { id: true, author: true, audiobookCategories: { select: { categoryId: true } } },
      });
      if (!audiobook) {
        throw new NotFoundException(`Audiobook "${slug}" not found`);
      }

      const categoryIds = audiobook.audiobookCategories.map(({ categoryId }) => categoryId);
      const similar = await this.prisma.audiobook.findMany({
        where: {
          ...published,
          id: { not: audiobook.id },
          OR: [
            { author: audiobook.author },
            ...(categoryIds.length
              ? [{ audiobookCategories: { some: { categoryId: { in: categoryIds } } } }]
              : []),
          ],
        },
        include: audiobookInclude,
        orderBy: catalogOrderBy('popular'),
        take: SIMILAR_LIMIT,
      });
      const ratings = await this.ratings.forAudiobooks(similar.map((item) => item.id));
      return similar.map((item) =>
        toAudiobookListItem(item, this.storage, RatingsService.of(ratings, item.id)),
      );
    });
  }
}
