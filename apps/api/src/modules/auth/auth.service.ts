import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { AccessTokenPayload } from '../../common/auth/authenticated-user';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { emailVerificationMail, passwordResetMail } from '../mail/mail.templates';
import { MailMessage } from '../mail/mail.types';
import { publicUserSelect, toPublicUser } from '../users/user.mapper';
import {
  EMAIL_VERIFICATION_TTL_HOURS,
  LOGIN_LOCKOUT_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  PASSWORD_RESET_TTL_MINUTES,
} from './auth.constants';
import { AuthResponse } from './dto/auth-response';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { IssuedSession, SessionsService } from './sessions.service';
import { generateSecureToken, hashToken } from './tokens';

export interface AuthResult {
  response: AuthResponse;
  session: IssuedSession;
}

const INVALID_CREDENTIALS = 'Invalid email or password';
const INVALID_TOKEN = 'Invalid or expired token';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true }).replace(/\/+$/, '');
  }

  // ─── Регистрация и вход ────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(dto.password);

    let user: User;
    try {
      // Роль и статус задаёт только сервер: USER / ACTIVE
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'USER',
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }

    await this.sendVerificationEmail(user.id, user.email);
    return this.issueTokens(user.id);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || user.deletedAt || !user.passwordHash) {
      await this.passwords.verifyAgainstDummy(dto.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException(
        'Too many failed login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!(await this.passwords.verify(dto.password, user.passwordHash))) {
      await this.registerFailedLogin(user.id);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        user.status === 'BANNED' ? 'Account is blocked' : 'Account is inactive',
      );
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return this.issueTokens(user.id);
  }

  private async registerFailedLogin(userId: string): Promise<void> {
    const { failedLoginAttempts } = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000),
        },
      });
      this.logger.warn(`Login locked for user ${userId} after ${failedLoginAttempts} failures`);
    }
  }

  // ─── Токены и сессии ───────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthResult> {
    const session = await this.sessions.rotate(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: session.session.userId },
      select: { status: true, deletedAt: true },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      await this.sessions.revokeAll(session.session.userId);
      throw new UnauthorizedException('Account is not active');
    }

    return this.buildResult(session);
  }

  logout(refreshToken: string): Promise<void> {
    return this.sessions.revokeByToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.revokeAll(userId);
  }

  private async issueTokens(userId: string): Promise<AuthResult> {
    return this.buildResult(await this.sessions.create(userId));
  }

  private async buildResult(session: IssuedSession): Promise<AuthResult> {
    const payload: AccessTokenPayload = { sub: session.session.userId, sid: session.session.id };
    const accessToken = await this.jwt.signAsync(payload);
    const { exp } = this.jwt.decode<{ exp: number }>(accessToken);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: session.session.userId },
      select: publicUserSelect,
    });

    return {
      session,
      response: {
        user: toPublicUser(user),
        accessToken,
        accessTokenExpiresAt: new Date(exp * 1000).toISOString(),
      },
    };
  }

  // ─── Подтверждение почты ───────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<void> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.expiresAt <= new Date()) {
      throw new BadRequestException(INVALID_TOKEN);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email is already verified');
    }
    await this.sendVerificationEmail(user.id, user.email);
  }

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = generateSecureToken();
    const data = {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
    };
    // Один активный токен на пользователя: новый заменяет старый
    await this.prisma.emailVerificationToken.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    const url = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.sendSafely(emailVerificationMail(email, url, EMAIL_VERIFICATION_TTL_HOURS));
  }

  // ─── Восстановление пароля ─────────────────────────────────────────────────

  /** Ответ одинаковый для любого e-mail, чтобы нельзя было проверить, зарегистрирован ли адрес. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return;
    }

    const token = generateSecureToken();
    const data = {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
    };
    await this.prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });

    const url = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.sendSafely(passwordResetMail(user.email, url, PASSWORD_RESET_TTL_MINUTES));
  }

  /** Новый пароль, снятие блокировки входа и выход со всех устройств. */
  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.expiresAt <= new Date()) {
      throw new BadRequestException(INVALID_TOKEN);
    }

    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      });
      await tx.passwordResetToken.delete({ where: { id: record.id } });
      await this.sessions.revokeAll(record.userId, undefined, tx);
    });
  }

  /** Ошибка отправки письма не должна ломать регистрацию или сброс пароля. */
  private async sendSafely(message: MailMessage): Promise<void> {
    try {
      await this.mail.send(message);
    } catch (error) {
      this.logger.error(
        `Failed to send "${message.subject}" to ${message.to}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
