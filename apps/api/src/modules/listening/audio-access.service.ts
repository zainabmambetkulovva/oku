import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Audiobook, AudioAccess, AudioChapter, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminActor } from '../categories/categories.service';
import { StorageService } from '../storage/storage.service';
import {
  FullAccessReason,
  fullAccessReason,
  isGrantActive,
  streamUrlTtlSeconds,
} from './access-rules';

type Db = PrismaService | Prisma.TransactionClient;

export interface AccessInfo {
  hasFullAccess: boolean;
  reason: FullAccessReason;
  /** Окончание купленного доступа; null — бессрочно или доступа нет */
  expiresAt: Date | null;
  /** Главы, которые можно слушать прямо сейчас */
  availableChapterIds: string[];
}

type AudiobookWithChapters = Audiobook & { audioChapters: AudioChapter[] };

/**
 * Доступ к аудиокнигам. Проверяется на backend при каждом запросе файла:
 * бесплатные главы — всем, полная версия — по действующему доступу.
 */
@Injectable()
export class AudioAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Аудиокнига по slug. Неопубликованная видна только тем, у кого есть полный доступ. */
  async findAudiobook(slug: string, user?: AuthenticatedUser): Promise<AudiobookWithChapters> {
    const audiobook = await this.prisma.audiobook.findFirst({
      where: { slug, deletedAt: null },
      include: { audioChapters: { orderBy: { chapterNumber: 'asc' } } },
    });
    if (!audiobook) {
      throw new NotFoundException(`Audiobook "${slug}" not found`);
    }
    if (audiobook.status !== 'ACTIVE' && !(await this.reasonFor(user, audiobook))) {
      throw new NotFoundException(`Audiobook "${slug}" not found`);
    }
    return audiobook;
  }

  async accessInfo(
    audiobook: AudiobookWithChapters,
    user?: AuthenticatedUser,
  ): Promise<AccessInfo> {
    const grant = user ? await this.findGrant(user.id, audiobook.id) : null;
    const reason = fullAccessReason(user, audiobook, grant);
    return {
      hasFullAccess: reason !== null,
      reason,
      expiresAt: reason === 'purchased' ? (grant?.expiresAt ?? null) : null,
      availableChapterIds: audiobook.audioChapters
        .filter((chapter) => reason !== null || chapter.isFreePreview)
        .map((chapter) => chapter.id),
    };
  }

  /** Проверка доступа к главе: 401 — нужно войти, 403 — нужно купить. */
  async assertCanListen(
    audiobook: AudiobookWithChapters,
    chapterId: string,
    user?: AuthenticatedUser,
  ): Promise<AudioChapter> {
    const chapter = audiobook.audioChapters.find((item) => item.id === chapterId);
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }
    if (chapter.isFreePreview && audiobook.status === 'ACTIVE') {
      return chapter;
    }
    if (await this.reasonFor(user, audiobook)) {
      return chapter;
    }
    if (!user) {
      throw new UnauthorizedException('Sign in to listen to this chapter');
    }
    throw new ForbiddenException('Purchase the audiobook to listen to this chapter');
  }

  /** Временная ссылка на файл главы после проверки доступа. */
  async streamUrl(slug: string, chapterId: string, user?: AuthenticatedUser) {
    const audiobook = await this.findAudiobook(slug, user);
    const chapter = await this.assertCanListen(audiobook, chapterId, user);
    const link = await this.storage.createDownloadUrl(
      chapter.storageKey,
      'audio-chapter',
      streamUrlTtlSeconds(chapter.durationSeconds),
    );
    return {
      ...link,
      chapter: {
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        durationSeconds: chapter.durationSeconds,
      },
    };
  }

  /** Есть ли полный доступ (для модулей покупок и библиотеки). */
  async hasFullAccess(user: AuthenticatedUser, audiobookId: string): Promise<boolean> {
    const audiobook = await this.prisma.audiobook.findUniqueOrThrow({ where: { id: audiobookId } });
    return (await this.reasonFor(user, audiobook)) !== null;
  }

  // ─── Администрирование ─────────────────────────────────────────────────────

  async listGrants(audiobookId: string) {
    await this.prisma.audiobook.findUniqueOrThrow({ where: { id: audiobookId } }).catch(() => {
      throw new NotFoundException('Audiobook not found');
    });
    const grants = await this.prisma.audioAccess.findMany({
      where: { audiobookId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { grantedAt: 'desc' },
    });
    return grants.map((grant) => ({ ...grant, isActive: isGrantActive(grant) }));
  }

  /**
   * Выдача доступа администратором (без покупки). Повторная выдача восстанавливает
   * отозванный доступ. Автоматическая выдача после оплаты — grantForOrderItem (этап Б6).
   */
  async grantByAdmin(
    audiobookId: string,
    email: string,
    expiresAt: string | undefined,
    actor: AdminActor,
  ): Promise<AudioAccess> {
    const audiobook = await this.prisma.audiobook.findUnique({ where: { id: audiobookId } });
    if (!audiobook) {
      throw new NotFoundException('Audiobook not found');
    }
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('User with this e-mail not found');
    }
    const expires = expiresAt ? new Date(expiresAt) : null;
    if (expires && expires <= new Date()) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    const grant = await this.upsertGrant(user.id, audiobookId, { expiresAt: expires });
    await this.audit.log({
      actorId: actor.id,
      action: 'audiobook.access.grant',
      entityType: 'audiobook',
      entityId: audiobookId,
      newData: { userId: user.id, email, expiresAt: expires },
      ipAddress: actor.ip,
    });
    return grant;
  }

  async revokeByAdmin(audiobookId: string, userId: string, actor: AdminActor): Promise<void> {
    const grant = await this.findGrant(userId, audiobookId);
    if (!grant || grant.revokedAt) {
      throw new NotFoundException('Active access not found');
    }
    await this.prisma.audioAccess.update({
      where: { id: grant.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'audiobook.access.revoke',
      entityType: 'audiobook',
      entityId: audiobookId,
      oldData: { userId, grantedAt: grant.grantedAt, expiresAt: grant.expiresAt },
      ipAddress: actor.ip,
    });
  }

  /** Бессрочный доступ после подтверждённой оплаты. Повторный вызов ничего не дублирует. */
  grantForOrderItem(
    userId: string,
    audiobookId: string,
    orderItemId: string,
    db: Db = this.prisma,
  ): Promise<AudioAccess> {
    return this.upsertGrant(userId, audiobookId, { expiresAt: null, orderItemId }, db);
  }

  // ─── Вспомогательное ───────────────────────────────────────────────────────

  private async reasonFor(
    user: AuthenticatedUser | undefined,
    audiobook: Pick<Audiobook, 'id' | 'price' | 'status'>,
  ): Promise<FullAccessReason> {
    const grant = user ? await this.findGrant(user.id, audiobook.id) : null;
    return fullAccessReason(user, audiobook, grant);
  }

  private findGrant(userId: string, audiobookId: string, db: Db = this.prisma) {
    return db.audioAccess.findUnique({ where: { userId_audiobookId: { userId, audiobookId } } });
  }

  private upsertGrant(
    userId: string,
    audiobookId: string,
    data: { expiresAt: Date | null; orderItemId?: string },
    db: Db = this.prisma,
  ): Promise<AudioAccess> {
    const values = { ...data, revokedAt: null, grantedAt: new Date() };
    return db.audioAccess.upsert({
      where: { userId_audiobookId: { userId, audiobookId } },
      create: { userId, audiobookId, ...values },
      update: values,
    });
  }
}
