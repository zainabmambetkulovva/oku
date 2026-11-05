import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { rejectNulls } from '../../common/utils/reject-nulls';
import { uniqueSlug } from '../../common/utils/slug';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { AdminProductQueryDto } from '../catalog/catalog-query.dto';
import { searchWhere } from '../catalog/catalog.mapper';
import { AdminActor, CategoriesService } from '../categories/categories.service';
import { StorageService } from '../storage/storage.service';
import { BookWithRelations, bookInclude, toAdminBook } from './book.mapper';
import { AddBookImageDto, CreateBookDto, UpdateBookDto } from './dto/book.dto';

export const MAX_BOOK_IMAGES = 10;

@Injectable()
export class AdminBooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  async list(query: AdminProductQueryDto) {
    const where: Prisma.BookWhereInput = {
      deletedAt: null,
      ...searchWhere(query.search),
      ...(query.status && { status: query.status }),
    };
    const [books, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        include: bookInclude,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.book.count({ where }),
    ]);
    return paginated(
      books.map((book) => toAdminBook(book, this.storage)),
      total,
      query,
    );
  }

  async get(id: string) {
    return toAdminBook(await this.findById(id), this.storage);
  }

  /** Новая книга всегда создаётся черновиком. */
  async create(dto: CreateBookDto, actor: AdminActor) {
    const { categoryIds = [], ...fields } = dto;
    await this.categories.assertExist(categoryIds);
    if (fields.coverKey) {
      await this.storage.assertUploaded(fields.coverKey, 'book-cover');
    }

    const slug = fields.slug ?? (await uniqueSlug(fields.title, (s) => this.slugTaken(s)));
    const book = await this.withUniqueConflict(() =>
      this.prisma.book.create({
        data: {
          ...fields,
          slug,
          status: 'DRAFT',
          bookCategories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        },
        include: bookInclude,
      }),
    );

    await this.afterWrite('book.create', book.id, actor, undefined, snapshot(book));
    return toAdminBook(book, this.storage);
  }

  async update(id: string, dto: UpdateBookDto, actor: AdminActor) {
    rejectNulls(dto, ['title', 'slug', 'author', 'price', 'stockQuantity', 'categoryIds']);
    const before = await this.findById(id);
    const { categoryIds, ...fields } = dto;

    if (categoryIds) {
      await this.categories.assertExist(categoryIds);
    }
    if (fields.coverKey && fields.coverKey !== before.coverKey) {
      await this.storage.assertUploaded(fields.coverKey, 'book-cover');
    }

    const book = await this.withUniqueConflict(() =>
      this.prisma.book.update({
        where: { id },
        data: {
          ...(fields as Prisma.BookUpdateInput),
          ...(categoryIds && {
            bookCategories: {
              deleteMany: {},
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }),
        },
        include: bookInclude,
      }),
    );

    await this.afterWrite('book.update', id, actor, snapshot(before), snapshot(book));
    return toAdminBook(book, this.storage);
  }

  async setStatus(id: string, status: BookWithRelations['status'], actor: AdminActor) {
    const before = await this.findById(id);
    const book = await this.prisma.book.update({
      where: { id },
      data: { status },
      include: bookInclude,
    });
    await this.afterWrite('book.status', id, actor, { status: before.status }, { status });
    return toAdminBook(book, this.storage);
  }

  /** Книгу, которая уже была в заказах, удалить нельзя — только снять с продажи. */
  async remove(id: string, actor: AdminActor): Promise<void> {
    const before = await this.findById(id);
    const orderItems = await this.prisma.orderItem.count({ where: { bookId: id } });
    if (orderItems > 0) {
      throw new ConflictException({
        message: 'Book has orders and cannot be deleted. Archive it instead (status ARCHIVED).',
        details: { orderItems },
      });
    }

    await this.prisma.book.delete({ where: { id } });
    await this.afterWrite('book.delete', id, actor, snapshot(before), undefined);
  }

  async addImage(id: string, dto: AddBookImageDto, actor: AdminActor) {
    const book = await this.findById(id);
    if (book.bookImages.length >= MAX_BOOK_IMAGES) {
      throw new BadRequestException(`No more than ${MAX_BOOK_IMAGES} images per book`);
    }
    await this.storage.assertUploaded(dto.storageKey, 'book-image');

    const image = await this.prisma.bookImage.create({
      data: {
        bookId: id,
        storageKey: dto.storageKey,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? book.bookImages.length,
      },
    });
    await this.afterWrite('book.image.add', id, actor, undefined, image);
    return { ...image, url: this.storage.publicUrl(image.storageKey) };
  }

  async removeImage(id: string, imageId: string, actor: AdminActor): Promise<void> {
    const image = await this.prisma.bookImage.findFirst({ where: { id: imageId, bookId: id } });
    if (!image) {
      throw new NotFoundException('Image not found');
    }
    await this.prisma.bookImage.delete({ where: { id: imageId } });
    await this.afterWrite('book.image.remove', id, actor, image, undefined);
  }

  private async findById(id: string): Promise<BookWithRelations> {
    const book = await this.prisma.book.findFirst({
      where: { id, deletedAt: null },
      include: bookInclude,
    });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    return book;
  }

  private async slugTaken(slug: string): Promise<boolean> {
    return (await this.prisma.book.count({ where: { slug } })) > 0;
  }

  private async withUniqueConflict<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const fields = (error.meta?.target as string[] | undefined) ?? [];
        throw new ConflictException(
          fields.includes('isbn')
            ? 'Book with this ISBN already exists'
            : 'Book with this slug already exists',
        );
      }
      throw error;
    }
  }

  private async afterWrite(
    action: string,
    entityId: string,
    actor: AdminActor,
    oldData: unknown,
    newData: unknown,
  ): Promise<void> {
    await this.audit.log({
      actorId: actor.id,
      action,
      entityType: 'book',
      entityId,
      oldData,
      newData,
      ipAddress: actor.ip,
    });
    await this.cache.invalidateCatalog();
  }
}

/** Данные книги для журнала: поля и id категорий, без вложенных объектов. */
function snapshot(book: BookWithRelations) {
  const { bookCategories, bookImages, ...fields } = book;
  return { ...fields, categoryIds: bookCategories.map(({ category }) => category.id) };
}
