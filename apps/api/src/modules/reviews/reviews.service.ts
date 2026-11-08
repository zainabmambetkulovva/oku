import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Review } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { rejectNulls } from '../../common/utils/reject-nulls';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { AdminActor } from '../categories/categories.service';
import {
  AdminReviewsQueryDto,
  CreateReviewDto,
  LatestReviewsQueryDto,
  ReviewsQueryDto,
  UpdateReviewDto,
} from './dto/reviews.dto';

export type ProductKind = 'book' | 'audiobook';

const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] as const;

const reviewInclude = {
  user: { select: { id: true, firstName: true, lastName: true } },
  book: { select: { id: true, slug: true, title: true } },
  audiobook: { select: { id: true, slug: true, title: true } },
} satisfies Prisma.ReviewInclude;

type ReviewWithRelations = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

/**
 * Отзывы. Оставить может любой зарегистрированный пользователь, отзыв публикуется
 * сразу; администратор скрывает (REJECTED) или удаляет неподходящие.
 * У купивших товар — пометка isVerifiedPurchase.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  // ─── Публичная часть ───────────────────────────────────────────────────────

  async listForProduct(kind: ProductKind, slug: string, query: ReviewsQueryDto) {
    const product = await this.findProduct(kind, slug);
    const where: Prisma.ReviewWhereInput = {
      ...this.productWhere(kind, product.id),
      status: 'APPROVED',
    };
    const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
      query.sort === 'rating_desc'
        ? [{ rating: 'desc' }, { createdAt: 'desc' }]
        : query.sort === 'rating_asc'
          ? [{ rating: 'asc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: [...orderBy, { id: 'asc' }],
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    const verified = await this.verifiedPurchases(reviews);
    return paginated(
      reviews.map((review) => this.toPublic(review, verified)),
      total,
      query,
    );
  }

  /**
   * Последние опубликованные отзывы с текстом — для главной страницы.
   * Только по товарам, которые сейчас продаются.
   */
  async latest(query: LatestReviewsQueryDto) {
    const reviews = await this.prisma.review.findMany({
      where: {
        status: 'APPROVED',
        text: { not: null },
        NOT: { text: '' },
        user: { status: 'ACTIVE', deletedAt: null },
        OR: [
          { book: { status: 'ACTIVE', deletedAt: null } },
          { audiobook: { status: 'ACTIVE', deletedAt: null } },
        ],
      },
      include: reviewInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: query.limit,
    });
    const verified = await this.verifiedPurchases(reviews);
    return reviews.map((review) => {
      const product = review.book ?? review.audiobook;
      return {
        ...this.toPublic(review, verified),
        product: product && {
          type: review.book ? ('BOOK' as const) : ('AUDIOBOOK' as const),
          slug: product.slug,
          title: product.title,
        },
      };
    });
  }

  /** Средняя оценка, количество и распределение по звёздам. */
  async summary(kind: ProductKind, slug: string) {
    const product = await this.findProduct(kind, slug);
    const groups = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { ...this.productWhere(kind, product.id), status: 'APPROVED' },
      _count: { _all: true },
    });

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0;
    let sum = 0;
    for (const group of groups) {
      distribution[group.rating as 1 | 2 | 3 | 4 | 5] = group._count._all;
      count += group._count._all;
      sum += group.rating * group._count._all;
    }
    return {
      average: count === 0 ? null : Math.round((sum / count) * 10) / 10,
      count,
      distribution,
    };
  }

  // ─── Отзывы пользователя ───────────────────────────────────────────────────

  async create(user: AuthenticatedUser, kind: ProductKind, slug: string, dto: CreateReviewDto) {
    const product = await this.findProduct(kind, slug);
    try {
      const review = await this.prisma.review.create({
        data: {
          userId: user.id,
          ...this.productWhere(kind, product.id),
          rating: dto.rating,
          text: dto.text || null,
          status: 'APPROVED',
        },
        include: reviewInclude,
      });
      await this.cache.invalidateCatalog();
      return this.toOwn(review, await this.verifiedPurchases([review]));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this product: edit your review');
      }
      throw error;
    }
  }

  async update(user: AuthenticatedUser, reviewId: string, dto: UpdateReviewDto) {
    rejectNulls(dto, ['rating']);
    const review = await this.findOwn(user.id, reviewId);
    if (review.status === 'REJECTED') {
      throw new ConflictException('This review was hidden by a moderator and cannot be edited');
    }
    const updated = await this.prisma.review.update({
      where: { id: review.id },
      data: {
        rating: dto.rating ?? undefined,
        ...(dto.text !== undefined && { text: dto.text || null }),
      },
      include: reviewInclude,
    });
    await this.cache.invalidateCatalog();
    return this.toOwn(updated, await this.verifiedPurchases([updated]));
  }

  async remove(user: AuthenticatedUser, reviewId: string): Promise<void> {
    const review = await this.findOwn(user.id, reviewId);
    await this.prisma.review.delete({ where: { id: review.id } });
    await this.cache.invalidateCatalog();
  }

  async mine(user: AuthenticatedUser, query: ReviewsQueryDto) {
    const where = { userId: user.id };
    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    const verified = await this.verifiedPurchases(reviews);
    return paginated(
      reviews.map((review) => this.toOwn(review, verified)),
      total,
      query,
    );
  }

  // ─── Модерация ─────────────────────────────────────────────────────────────

  async adminList(query: AdminReviewsQueryDto) {
    const where: Prisma.ReviewWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.productType === 'book' && { bookId: { not: null } }),
      ...(query.productType === 'audiobook' && { audiobookId: { not: null } }),
    };
    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: {
          ...reviewInclude,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return paginated(reviews, total, query);
  }

  async moderate(reviewId: string, status: 'APPROVED' | 'REJECTED', actor: AdminActor) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    const updated = await this.prisma.review.update({ where: { id: reviewId }, data: { status } });
    await this.audit.log({
      actorId: actor.id,
      action: status === 'REJECTED' ? 'review.reject' : 'review.approve',
      entityType: 'review',
      entityId: reviewId,
      oldData: { status: review.status },
      newData: { status },
      ipAddress: actor.ip,
    });
    await this.cache.invalidateCatalog();
    return updated;
  }

  async adminRemove(reviewId: string, actor: AdminActor): Promise<void> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.audit.log({
      actorId: actor.id,
      action: 'review.delete',
      entityType: 'review',
      entityId: reviewId,
      oldData: review,
      ipAddress: actor.ip,
    });
    await this.cache.invalidateCatalog();
  }

  // ─── Вспомогательное ───────────────────────────────────────────────────────

  private async findProduct(kind: ProductKind, slug: string): Promise<{ id: string }> {
    const where = { slug, status: 'ACTIVE' as const, deletedAt: null };
    const product =
      kind === 'book'
        ? await this.prisma.book.findFirst({ where, select: { id: true } })
        : await this.prisma.audiobook.findFirst({ where, select: { id: true } });
    if (!product) {
      throw new NotFoundException(
        kind === 'book' ? `Book "${slug}" not found` : `Audiobook "${slug}" not found`,
      );
    }
    return product;
  }

  private productWhere(kind: ProductKind, id: string) {
    return kind === 'book' ? { bookId: id } : { audiobookId: id };
  }

  private async findOwn(userId: string, reviewId: string): Promise<Review> {
    const review = await this.prisma.review.findFirst({ where: { id: reviewId, userId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  /** Множество «userId:productId» для авторов, купивших товар. */
  private async verifiedPurchases(reviews: Review[]): Promise<Set<string>> {
    const userIds = [...new Set(reviews.map((r) => r.userId))];
    const bookIds = reviews.flatMap((r) => (r.bookId ? [r.bookId] : []));
    const audiobookIds = reviews.flatMap((r) => (r.audiobookId ? [r.audiobookId] : []));
    const result = new Set<string>();

    if (bookIds.length > 0) {
      const items = await this.prisma.orderItem.findMany({
        where: {
          bookId: { in: bookIds },
          order: { userId: { in: userIds }, status: { in: [...PAID_STATUSES] } },
        },
        select: { bookId: true, order: { select: { userId: true } } },
      });
      items.forEach((item) => result.add(`${item.order.userId}:${item.bookId}`));
    }
    if (audiobookIds.length > 0) {
      const grants = await this.prisma.audioAccess.findMany({
        where: {
          audiobookId: { in: audiobookIds },
          userId: { in: userIds },
          orderItemId: { not: null },
          revokedAt: null,
        },
        select: { userId: true, audiobookId: true },
      });
      grants.forEach((grant) => result.add(`${grant.userId}:${grant.audiobookId}`));
    }
    return result;
  }

  private toPublic(review: ReviewWithRelations, verified: Set<string>) {
    const { firstName, lastName } = review.user;
    const name = [firstName, lastName ? `${lastName[0]}.` : null].filter(Boolean).join(' ');
    return {
      id: review.id,
      rating: review.rating,
      text: review.text,
      author: { name: name || 'Читатель' },
      isVerifiedPurchase: verified.has(`${review.userId}:${review.bookId ?? review.audiobookId}`),
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private toOwn(review: ReviewWithRelations, verified: Set<string>) {
    const product = review.book ?? review.audiobook;
    return {
      ...this.toPublic(review, verified),
      status: review.status,
      product: product && {
        type: review.book ? ('BOOK' as const) : ('AUDIOBOOK' as const),
        id: product.id,
        slug: product.slug,
        title: product.title,
      },
    };
  }
}
