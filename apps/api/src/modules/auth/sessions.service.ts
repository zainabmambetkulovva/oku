import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Session } from '@prisma/client';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { REFRESH_REUSE_GRACE_MS } from './auth.constants';
import { generateSecureToken, hashToken } from './tokens';

export interface IssuedSession {
  session: Session;
  /** Открытый refresh-токен — уходит клиенту в cookie, в БД не хранится */
  refreshToken: string;
}

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Сессии и refresh-токены.
 * Каждое обновление создаёт новую сессию и отзывает старую (ротация).
 * Повторное предъявление отозванного токена отзывает все сессии пользователя.
 */
@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.ttlMs = config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 24 * 60 * 60 * 1000;
  }

  async create(userId: string, db: Db = this.prisma): Promise<IssuedSession> {
    const refreshToken = generateSecureToken();
    const session = await db.session.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.ttlMs),
      },
    });
    return { session, refreshToken };
  }

  async rotate(refreshToken: string): Promise<IssuedSession> {
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt) {
      if (now.getTime() - session.revokedAt.getTime() > REFRESH_REUSE_GRACE_MS) {
        const revoked = await this.revokeAll(session.userId);
        this.logger.warn(
          `Revoked refresh token reused for user ${session.userId}: revoked ${revoked} session(s)`,
        );
      }
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (session.expiresAt <= now) {
      throw new UnauthorizedException('Refresh token expired');
    }

    return this.prisma.$transaction(async (tx) => {
      // Условие revokedAt: null защищает от двойной ротации одного токена
      const { count } = await tx.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      if (count === 0) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }
      return this.create(session.userId, tx);
    });
  }

  /** Выход: отзывает сессию по refresh-токену. Повторный вызов ничего не ломает. */
  async revokeByToken(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Отзывает все активные сессии пользователя, кроме exceptSessionId. */
  async revokeAll(userId: string, exceptSessionId?: string, db: Db = this.prisma): Promise<number> {
    const { count } = await db.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: { revokedAt: new Date() },
    });
    return count;
  }
}
