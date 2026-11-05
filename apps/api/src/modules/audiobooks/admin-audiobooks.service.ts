import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
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
import { AudiobookWithRelations, audiobookInclude, toAdminAudiobook } from './audiobook.mapper';
import {
  CreateAudiobookDto,
  CreateChapterDto,
  ReorderChaptersDto,
  UpdateAudiobookDto,
  UpdateChapterDto,
} from './dto/audiobook.dto';

type Tx = Prisma.TransactionClient;

/** Временный сдвиг номеров глав при смене порядка (уникальность audiobook_id + номер). */
const REORDER_OFFSET = 1_000_000;

@Injectable()
export class AdminAudiobooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ─── Аудиокниги ────────────────────────────────────────────────────────────

  async list(query: AdminProductQueryDto) {
    const where: Prisma.AudiobookWhereInput = {
      deletedAt: null,
      ...searchWhere(query.search),
      ...(query.status && { status: query.status }),
    };
    const [audiobooks, total] = await this.prisma.$transaction([
      this.prisma.audiobook.findMany({
        where,
        include: audiobookInclude,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.audiobook.count({ where }),
    ]);
    return paginated(
      audiobooks.map((audiobook) => toAdminAudiobook(audiobook, this.storage)),
      total,
      query,
    );
  }

  async get(id: string) {
    return toAdminAudiobook(await this.findById(id), this.storage);
  }

  /** Новая аудиокнига создаётся черновиком без глав. */
  async create(dto: CreateAudiobookDto, actor: AdminActor) {
    const { categoryIds = [], ...fields } = dto;
    await this.categories.assertExist(categoryIds);
    if (fields.coverKey) {
      await this.storage.assertUploaded(fields.coverKey, 'audiobook-cover');
    }

    const slug = fields.slug ?? (await uniqueSlug(fields.title, (s) => this.slugTaken(s)));
    const audiobook = await this.withSlugConflict(() =>
      this.prisma.audiobook.create({
        data: {
          ...fields,
          slug,
          status: 'DRAFT',
          durationSeconds: 0,
          audiobookCategories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        },
        include: audiobookInclude,
      }),
    );

    await this.afterWrite('audiobook.create', audiobook.id, actor, undefined, snapshot(audiobook));
    return toAdminAudiobook(audiobook, this.storage);
  }

  async update(id: string, dto: UpdateAudiobookDto, actor: AdminActor) {
    rejectNulls(dto, ['title', 'slug', 'author', 'price', 'categoryIds']);
    const before = await this.findById(id);
    const { categoryIds, ...fields } = dto;

    if (categoryIds) {
      await this.categories.assertExist(categoryIds);
    }
    if (fields.coverKey && fields.coverKey !== before.coverKey) {
      await this.storage.assertUploaded(fields.coverKey, 'audiobook-cover');
    }

    const audiobook = await this.withSlugConflict(() =>
      this.prisma.audiobook.update({
        where: { id },
        data: {
          ...(fields as Prisma.AudiobookUpdateInput),
          ...(categoryIds && {
            audiobookCategories: {
              deleteMany: {},
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }),
        },
        include: audiobookInclude,
      }),
    );

    await this.afterWrite('audiobook.update', id, actor, snapshot(before), snapshot(audiobook));
    return toAdminAudiobook(audiobook, this.storage);
  }

  /** Опубликовать можно только аудиокнигу, у которой есть главы. */
  async setStatus(id: string, status: ProductStatus, actor: AdminActor) {
    const before = await this.findById(id);
    if (status === 'ACTIVE' && before.audioChapters.length === 0) {
      throw new ConflictException('Add at least one chapter before publishing the audiobook');
    }

    const audiobook = await this.prisma.audiobook.update({
      where: { id },
      data: { status },
      include: audiobookInclude,
    });
    await this.afterWrite('audiobook.status', id, actor, { status: before.status }, { status });
    return toAdminAudiobook(audiobook, this.storage);
  }

  /** Аудиокнигу с заказами или выданным доступом удалить нельзя — только снять с продажи. */
  async remove(id: string, actor: AdminActor): Promise<void> {
    const before = await this.findById(id);
    const [orderItems, accessGrants] = await Promise.all([
      this.prisma.orderItem.count({ where: { audiobookId: id } }),
      this.prisma.audioAccess.count({ where: { audiobookId: id } }),
    ]);
    if (orderItems > 0 || accessGrants > 0) {
      throw new ConflictException({
        message:
          'Audiobook has orders or granted access and cannot be deleted. Archive it instead (status ARCHIVED).',
        details: { orderItems, accessGrants },
      });
    }

    await this.prisma.audiobook.delete({ where: { id } });
    await this.afterWrite('audiobook.delete', id, actor, snapshot(before), undefined);
  }

  // ─── Главы ─────────────────────────────────────────────────────────────────

  /** Новая глава добавляется в конец. Длительность аудиокниги пересчитывается. */
  async addChapter(id: string, dto: CreateChapterDto, actor: AdminActor) {
    await this.findById(id);
    await this.storage.assertUploaded(dto.storageKey, 'audio-chapter');

    const chapter = await this.prisma.$transaction(async (tx) => {
      const last = await tx.audioChapter.aggregate({
        where: { audiobookId: id },
        _max: { chapterNumber: true },
      });
      const created = await tx.audioChapter.create({
        data: { ...dto, audiobookId: id, chapterNumber: (last._max.chapterNumber ?? 0) + 1 },
      });
      await this.recalculateDuration(tx, id);
      return created;
    });

    await this.afterWrite('audiobook.chapter.add', id, actor, undefined, chapter);
    return chapter;
  }

  async updateChapter(id: string, chapterId: string, dto: UpdateChapterDto, actor: AdminActor) {
    rejectNulls(dto, ['title', 'durationSeconds', 'storageKey', 'isFreePreview']);
    const before = await this.findChapter(id, chapterId);
    if (dto.storageKey && dto.storageKey !== before.storageKey) {
      await this.storage.assertUploaded(dto.storageKey, 'audio-chapter');
    }

    const chapter = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.audioChapter.update({
        where: { id: chapterId },
        data: dto as Prisma.AudioChapterUpdateInput,
      });
      await this.recalculateDuration(tx, id);
      return updated;
    });

    await this.afterWrite('audiobook.chapter.update', id, actor, before, chapter);
    return chapter;
  }

  /** Удаление главы; номера оставшихся глав идут подряд. */
  async removeChapter(id: string, chapterId: string, actor: AdminActor): Promise<void> {
    const audiobook = await this.findById(id);
    const chapter = await this.findChapter(id, chapterId);

    if (audiobook.status === 'ACTIVE' && audiobook.audioChapters.length === 1) {
      throw new ConflictException(
        'Cannot delete the last chapter of a published audiobook. Unpublish it first.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.audioChapter.delete({ where: { id: chapterId } });
      const remaining = audiobook.audioChapters
        .filter((item) => item.id !== chapterId)
        .map((item) => item.id);
      await this.renumber(tx, id, remaining);
      await this.recalculateDuration(tx, id);
    });

    await this.afterWrite('audiobook.chapter.remove', id, actor, chapter, undefined);
  }

  /** Новый порядок глав: передаются все главы аудиокниги. */
  async reorderChapters(id: string, dto: ReorderChaptersDto, actor: AdminActor) {
    const audiobook = await this.findById(id);
    const current = audiobook.audioChapters.map((chapter) => chapter.id);

    const sameSet =
      current.length === dto.chapterIds.length &&
      dto.chapterIds.every((chapterId) => current.includes(chapterId));
    if (!sameSet) {
      throw new BadRequestException('chapterIds must contain every chapter of the audiobook once');
    }

    await this.prisma.$transaction((tx) => this.renumber(tx, id, dto.chapterIds));
    await this.afterWrite(
      'audiobook.chapter.reorder',
      id,
      actor,
      { chapterIds: current },
      { chapterIds: dto.chapterIds },
    );
    return toAdminAudiobook(await this.findById(id), this.storage);
  }

  // ─── Вспомогательное ───────────────────────────────────────────────────────

  /** Номера 1..N в заданном порядке. Сначала сдвиг, чтобы не нарушить уникальность. */
  private async renumber(tx: Tx, audiobookId: string, orderedIds: string[]): Promise<void> {
    await tx.audioChapter.updateMany({
      where: { audiobookId },
      data: { chapterNumber: { increment: REORDER_OFFSET } },
    });
    for (const [index, chapterId] of orderedIds.entries()) {
      await tx.audioChapter.update({
        where: { id: chapterId },
        data: { chapterNumber: index + 1 },
      });
    }
  }

  private async recalculateDuration(tx: Tx, audiobookId: string): Promise<void> {
    const { _sum } = await tx.audioChapter.aggregate({
      where: { audiobookId },
      _sum: { durationSeconds: true },
    });
    await tx.audiobook.update({
      where: { id: audiobookId },
      data: { durationSeconds: _sum.durationSeconds ?? 0 },
    });
  }

  private async findById(id: string): Promise<AudiobookWithRelations> {
    const audiobook = await this.prisma.audiobook.findFirst({
      where: { id, deletedAt: null },
      include: audiobookInclude,
    });
    if (!audiobook) {
      throw new NotFoundException('Audiobook not found');
    }
    return audiobook;
  }

  private async findChapter(audiobookId: string, chapterId: string) {
    const chapter = await this.prisma.audioChapter.findFirst({
      where: { id: chapterId, audiobookId },
    });
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }
    return chapter;
  }

  private async slugTaken(slug: string): Promise<boolean> {
    return (await this.prisma.audiobook.count({ where: { slug } })) > 0;
  }

  private async withSlugConflict<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Audiobook with this slug already exists');
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
      entityType: 'audiobook',
      entityId,
      oldData,
      newData,
      ipAddress: actor.ip,
    });
    await this.cache.invalidateCatalog();
  }
}

function snapshot(audiobook: AudiobookWithRelations) {
  const { audiobookCategories, audioChapters, ...fields } = audiobook;
  return {
    ...fields,
    categoryIds: audiobookCategories.map(({ category }) => category.id),
    chaptersCount: audioChapters.length,
  };
}
