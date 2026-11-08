import { BadRequestException, Injectable } from '@nestjs/common';
import { AudioChapter, ListeningProgress } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { paginated, PaginationQueryDto, skipFor } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { fullAccessReason } from './access-rules';
import { AudioAccessService } from './audio-access.service';
import { SaveProgressDto } from './dto/listening.dto';

/** Доля прослушанного: все предыдущие главы + позиция в текущей. */
function percentListened(
  progress: Pick<ListeningProgress, 'chapterId' | 'positionSeconds' | 'completed'>,
  chapters: Pick<AudioChapter, 'id' | 'durationSeconds' | 'chapterNumber'>[],
): number {
  const total = chapters.reduce((sum, chapter) => sum + chapter.durationSeconds, 0);
  if (progress.completed) {
    return 100;
  }
  if (total === 0 || !progress.chapterId) {
    return 0;
  }
  const current = chapters.find((chapter) => chapter.id === progress.chapterId);
  if (!current) {
    return 0;
  }
  const before = chapters
    .filter((chapter) => chapter.chapterNumber < current.chapterNumber)
    .reduce((sum, chapter) => sum + chapter.durationSeconds, 0);
  return Math.min(100, Math.round(((before + progress.positionSeconds) / total) * 100));
}

function toProgress(
  progress: ListeningProgress,
  chapters: Pick<AudioChapter, 'id' | 'durationSeconds' | 'chapterNumber'>[],
) {
  return {
    chapterId: progress.chapterId,
    positionSeconds: progress.positionSeconds,
    completed: progress.completed,
    percent: percentListened(progress, chapters),
    lastListenedAt: progress.lastListenedAt,
  };
}

/**
 * Прогресс прослушивания. Запись прогресса доступа не даёт:
 * сохранить позицию можно только в главе, которую пользователь вправе слушать.
 */
@Injectable()
export class ListeningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AudioAccessService,
    private readonly storage: StorageService,
  ) {}

  async getProgress(slug: string, user: AuthenticatedUser) {
    const audiobook = await this.access.findAudiobook(slug, user);
    const progress = await this.prisma.listeningProgress.findUnique({
      where: { userId_audiobookId: { userId: user.id, audiobookId: audiobook.id } },
    });
    return progress ? toProgress(progress, audiobook.audioChapters) : null;
  }

  async saveProgress(slug: string, user: AuthenticatedUser, dto: SaveProgressDto) {
    const audiobook = await this.access.findAudiobook(slug, user);
    const chapter = await this.access.assertCanListen(audiobook, dto.chapterId, user);
    if (dto.positionSeconds > chapter.durationSeconds) {
      throw new BadRequestException('positionSeconds must not exceed the chapter duration');
    }

    const data = {
      chapterId: chapter.id,
      positionSeconds: dto.positionSeconds,
      completed: dto.completed ?? false,
      lastListenedAt: new Date(),
    };
    const progress = await this.prisma.listeningProgress.upsert({
      where: { userId_audiobookId: { userId: user.id, audiobookId: audiobook.id } },
      create: { userId: user.id, audiobookId: audiobook.id, ...data },
      update: data,
    });
    return toProgress(progress, audiobook.audioChapters);
  }

  /** Купленные аудиокниги (действующий доступ) с прогрессом. */
  async myAudiobooks(user: AuthenticatedUser, query: PaginationQueryDto) {
    const now = new Date();
    const where = {
      userId: user.id,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      audiobook: { deletedAt: null },
    };
    const [grants, total] = await this.prisma.$transaction([
      this.prisma.audioAccess.findMany({
        where,
        include: {
          audiobook: {
            include: {
              audioChapters: { orderBy: { chapterNumber: 'asc' } },
              listeningProgress: { where: { userId: user.id } },
            },
          },
        },
        orderBy: { grantedAt: 'desc' },
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.audioAccess.count({ where }),
    ]);

    return paginated(
      grants.map(({ audiobook, grantedAt, expiresAt }) => ({
        audiobook: this.summary(audiobook),
        grantedAt,
        expiresAt,
        progress: audiobook.listeningProgress[0]
          ? toProgress(audiobook.listeningProgress[0], audiobook.audioChapters)
          : null,
      })),
      total,
      query,
    );
  }

  /** История прослушивания: сначала последние — для «Продолжить прослушивание». */
  async history(user: AuthenticatedUser, query: PaginationQueryDto) {
    const where = {
      userId: user.id,
      lastListenedAt: { not: null },
      audiobook: { deletedAt: null },
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.listeningProgress.findMany({
        where,
        include: {
          chapter: true,
          audiobook: {
            include: {
              audioChapters: { orderBy: { chapterNumber: 'asc' } },
              audioAccess: { where: { userId: user.id } },
            },
          },
        },
        orderBy: { lastListenedAt: 'desc' },
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.listeningProgress.count({ where }),
    ]);

    return paginated(
      records.map((record) => ({
        audiobook: this.summary(record.audiobook),
        chapter: record.chapter && {
          id: record.chapter.id,
          chapterNumber: record.chapter.chapterNumber,
          title: record.chapter.title,
          durationSeconds: record.chapter.durationSeconds,
        },
        progress: toProgress(record, record.audiobook.audioChapters),
        hasFullAccess:
          fullAccessReason(user, record.audiobook, record.audiobook.audioAccess[0]) !== null,
      })),
      total,
      query,
    );
  }

  private summary(audiobook: {
    id: string;
    slug: string;
    title: string;
    author: string;
    narrator: string | null;
    coverKey: string | null;
    durationSeconds: number;
    status: string;
  }) {
    return {
      id: audiobook.id,
      slug: audiobook.slug,
      title: audiobook.title,
      author: audiobook.author,
      narrator: audiobook.narrator,
      coverUrl: this.storage.publicUrl(audiobook.coverKey),
      durationSeconds: audiobook.durationSeconds,
      isAvailableForSale: audiobook.status === 'ACTIVE',
    };
  }
}
