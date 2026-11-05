import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { stableKey } from '../../common/utils/stable-key';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { BookCatalogQueryDto } from '../catalog/catalog-query.dto';
import {
  CATALOG_CACHE_TTL_SECONDS,
  SIMILAR_LIMIT,
  catalogOrderBy,
} from '../catalog/catalog.constants';
import { priceWhere, searchWhere } from '../catalog/catalog.mapper';
import { CategoriesService } from '../categories/categories.service';
import { StorageService } from '../storage/storage.service';
import { bookInclude, toBookDetails, toBookListItem } from './book.mapper';

const published = { status: 'ACTIVE', deletedAt: null } satisfies Prisma.BookWhereInput;

/** Публичный каталог физических книг: только опубликованные. */
@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
  ) {}

  async list(query: BookCatalogQueryDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('minPrice must not be greater than maxPrice');
    }

    return this.cache.catalog(
      `books:list:${stableKey(query)}`,
      CATALOG_CACHE_TTL_SECONDS,
      async () => {
        const where: Prisma.BookWhereInput = {
          ...published,
          ...searchWhere(query.search),
          ...priceWhere(query.minPrice, query.maxPrice),
          ...(query.language && { language: query.language }),
          ...(query.inStock === true && { stockQuantity: { gt: 0 } }),
          ...(query.inStock === false && { stockQuantity: 0 }),
        };

        if (query.category) {
          const categoryIds = await this.categories.idsWithDescendants(query.category);
          where.bookCategories = { some: { categoryId: { in: categoryIds } } };
        }

        const [books, total] = await this.prisma.$transaction([
          this.prisma.book.findMany({
            where,
            include: bookInclude,
            orderBy: catalogOrderBy(query.sort),
            skip: skipFor(query),
            take: query.limit,
          }),
          this.prisma.book.count({ where }),
        ]);

        return paginated(
          books.map((book) => toBookListItem(book, this.storage)),
          total,
          query,
        );
      },
    );
  }

  findBySlug(slug: string) {
    return this.cache.catalog(`books:slug:${slug}`, CATALOG_CACHE_TTL_SECONDS, async () => {
      const book = await this.prisma.book.findFirst({
        where: { ...published, slug },
        include: bookInclude,
      });
      if (!book) {
        throw new NotFoundException(`Book "${slug}" not found`);
      }
      return toBookDetails(book, this.storage);
    });
  }

  /** Похожие книги: общие категории или тот же автор, сначала популярные. */
  similar(slug: string) {
    return this.cache.catalog(`books:similar:${slug}`, CATALOG_CACHE_TTL_SECONDS, async () => {
      const book = await this.prisma.book.findFirst({
        where: { ...published, slug },
        select: { id: true, author: true, bookCategories: { select: { categoryId: true } } },
      });
      if (!book) {
        throw new NotFoundException(`Book "${slug}" not found`);
      }

      const categoryIds = book.bookCategories.map(({ categoryId }) => categoryId);
      const similar = await this.prisma.book.findMany({
        where: {
          ...published,
          id: { not: book.id },
          OR: [
            { author: book.author },
            ...(categoryIds.length
              ? [{ bookCategories: { some: { categoryId: { in: categoryIds } } } }]
              : []),
          ],
        },
        include: bookInclude,
        orderBy: catalogOrderBy('popular'),
        take: SIMILAR_LIMIT,
      });
      return similar.map((item) => toBookListItem(item, this.storage));
    });
  }
}
