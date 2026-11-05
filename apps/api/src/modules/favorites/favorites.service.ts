import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AddFavoriteDto, FavoritesQueryDto } from './dto/favorites.dto';

const favoriteInclude = { book: true, audiobook: true } satisfies Prisma.FavoriteInclude;
type FavoriteWithProduct = Prisma.FavoriteGetPayload<{ include: typeof favoriteInclude }>;

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(userId: string, query: FavoritesQueryDto) {
    const where: Prisma.FavoriteWhereInput = {
      userId,
      ...(query.type === 'book' && { bookId: { not: null } }),
      ...(query.type === 'audiobook' && { audiobookId: { not: null } }),
    };
    const [favorites, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where,
        include: favoriteInclude,
        orderBy: { createdAt: 'desc' },
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.favorite.count({ where }),
    ]);
    return paginated(
      favorites.map((favorite) => this.toResponse(favorite)),
      total,
      query,
    );
  }

  /** id избранных товаров — чтобы отметить «сердечки» в каталоге. */
  async ids(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { bookId: true, audiobookId: true },
    });
    return {
      bookIds: favorites.flatMap((f) => (f.bookId ? [f.bookId] : [])),
      audiobookIds: favorites.flatMap((f) => (f.audiobookId ? [f.audiobookId] : [])),
    };
  }

  /** Добавление. Повторное добавление того же товара возвращает существующую запись. */
  async add(userId: string, dto: AddFavoriteDto) {
    if (Boolean(dto.bookId) === Boolean(dto.audiobookId)) {
      throw new BadRequestException('Specify exactly one of bookId or audiobookId');
    }

    const product = dto.bookId
      ? await this.prisma.book.findFirst({
          where: { id: dto.bookId, status: 'ACTIVE', deletedAt: null },
        })
      : await this.prisma.audiobook.findFirst({
          where: { id: dto.audiobookId, status: 'ACTIVE', deletedAt: null },
        });
    if (!product) {
      throw new NotFoundException(dto.bookId ? 'Book not found' : 'Audiobook not found');
    }

    const where = dto.bookId
      ? { userId_bookId: { userId, bookId: dto.bookId } }
      : { userId_audiobookId: { userId, audiobookId: dto.audiobookId! } };

    const favorite = await this.prisma.favorite.upsert({
      where,
      create: { userId, bookId: dto.bookId, audiobookId: dto.audiobookId },
      update: {},
      include: favoriteInclude,
    });
    return this.toResponse(favorite);
  }

  async removeBook(userId: string, bookId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, bookId } });
  }

  async removeAudiobook(userId: string, audiobookId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, audiobookId } });
  }

  private toResponse(favorite: FavoriteWithProduct) {
    const product = favorite.book ?? favorite.audiobook!;
    return {
      id: favorite.id,
      createdAt: favorite.createdAt,
      product: {
        type: favorite.book ? ('BOOK' as const) : ('AUDIOBOOK' as const),
        id: product.id,
        slug: product.slug,
        title: product.title,
        author: product.author,
        coverUrl: this.storage.publicUrl(product.coverKey),
        price: product.price,
        currency: product.currency,
        /** Снятый с продажи товар остаётся в избранном, но купить его нельзя */
        isAvailable: product.status === 'ACTIVE' && product.deletedAt === null,
        inStock: favorite.book ? favorite.book.stockQuantity > 0 : null,
      },
    };
  }
}
