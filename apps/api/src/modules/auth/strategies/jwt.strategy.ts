import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload, AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { Env } from '../../../config/env';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Проверка access-токена. Кроме подписи и срока действия проверяется, что сессия
 * не отозвана, а пользователь активен и не удалён. Поэтому выход, блокировка и
 * смена роли действуют сразу, не дожидаясь истечения токена.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  async validate(payload: Partial<AccessTokenPayload>): Promise<AuthenticatedUser> {
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      throw new UnauthorizedException('Invalid access token');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: {
        user: { select: { id: true, email: true, role: true, status: true, deletedAt: true } },
      },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const { user } = session;
    if (user.deletedAt !== null || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    return { id: user.id, email: user.email, role: user.role, sessionId: session.id };
  }
}
