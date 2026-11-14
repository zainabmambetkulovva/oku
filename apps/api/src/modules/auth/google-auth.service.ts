import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { type SiteLocale } from './auth.constants';
import { generateSecureToken } from './tokens';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** Что хранится в cookie между уходом на Google и возвратом (10 минут). */
export interface GoogleFlowState {
  state: string;
  verifier: string;
  locale: SiteLocale;
  next: string | null;
}

/** Причина неудачи — по ней сайт показывает понятное сообщение. */
export type GoogleFailure = 'cancelled' | 'failed' | 'blocked' | 'unavailable';

export class GoogleAuthError extends Error {
  constructor(
    readonly reason: GoogleFailure,
    message: string,
  ) {
    super(message);
  }
}

interface GoogleIdToken {
  iss: string;
  aud: string;
  exp: number;
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
}

/** Адрес возврата только внутри сайта: /ru/books, но не //evil.com и не https://… */
export function safeNextPath(value: unknown): string | null {
  return typeof value === 'string' &&
    value.length <= 500 &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\')
    ? value
    : null;
}

function decodeJwtPayload(token: string): GoogleIdToken {
  const payload = token.split('.')[1];
  if (!payload) throw new GoogleAuthError('failed', 'Malformed id_token');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as GoogleIdToken;
}

/**
 * Вход через Google (OAuth 2.0 / OpenID Connect, authorization code + PKCE).
 * Ключи — GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET из переменных окружения.
 * id_token берётся напрямую у Google по TLS из ответа на обмен кода (OIDC Core 3.1.3.7),
 * у него проверяются издатель, получатель, срок и подтверждённость почты.
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  readonly redirectUri: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.clientId = config.get('GOOGLE_CLIENT_ID', { infer: true });
    this.clientSecret = config.get('GOOGLE_CLIENT_SECRET', { infer: true });
    const api = config.get('API_PUBLIC_URL', { infer: true }).replace(/\/+$/, '');
    this.redirectUri = `${api}/api/v1/auth/google/callback`;
  }

  get enabled(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /** Адрес страницы выбора аккаунта Google и состояние для cookie. */
  start(locale: SiteLocale, next: string | null): { url: string; flow: GoogleFlowState } {
    if (!this.enabled) throw new GoogleAuthError('unavailable', 'Google sign-in is not configured');
    const flow: GoogleFlowState = {
      state: generateSecureToken(),
      verifier: generateSecureToken(),
      locale,
      next,
    };
    const challenge = createHash('sha256').update(flow.verifier).digest('base64url');
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: flow.state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
      hl: locale === 'ky' ? 'ky' : 'ru',
    });
    return { url: `${GOOGLE_AUTH_URL}?${params.toString()}`, flow };
  }

  /** Возврат с Google: проверка state, обмен кода, поиск или создание пользователя. */
  async finish(
    query: Record<string, unknown>,
    flow: GoogleFlowState | null,
    locale: SiteLocale,
  ): Promise<User> {
    if (!this.enabled) throw new GoogleAuthError('unavailable', 'Google sign-in is not configured');
    if (typeof query.error === 'string') {
      throw new GoogleAuthError('cancelled', `Google returned error: ${query.error}`);
    }
    const state = typeof query.state === 'string' ? query.state : '';
    const code = typeof query.code === 'string' ? query.code : '';
    if (!flow || !code || !state || !sameString(state, flow.state)) {
      throw new GoogleAuthError('failed', 'OAuth state mismatch');
    }

    const profile = await this.exchangeCode(code, flow.verifier);
    return this.findOrCreateUser(profile, locale);
  }

  private async exchangeCode(code: string, verifier: string): Promise<GoogleIdToken> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => null)) as {
      id_token?: string;
      error?: string;
    } | null;
    if (!response.ok || !body?.id_token) {
      throw new GoogleAuthError(
        'failed',
        `Token exchange failed: ${body?.error ?? response.status}`,
      );
    }

    const token = decodeJwtPayload(body.id_token);
    const verified = token.email_verified === true || token.email_verified === 'true';
    if (
      !GOOGLE_ISSUERS.includes(token.iss) ||
      token.aud !== this.clientId ||
      !token.sub ||
      token.exp * 1000 <= Date.now()
    ) {
      throw new GoogleAuthError('failed', 'Invalid id_token claims');
    }
    if (!token.email || !verified) {
      throw new GoogleAuthError('failed', 'Google account e-mail is not verified');
    }
    return { ...token, email: token.email.trim().toLowerCase() };
  }

  /**
   * 1) уже входил через Google — тот же пользователь;
   * 2) есть аккаунт с этой (подтверждённой Google) почтой — привязываем Google к нему;
   * 3) иначе — новый покупатель без пароля, почта сразу подтверждена.
   */
  private async findOrCreateUser(profile: GoogleIdToken, locale: SiteLocale): Promise<User> {
    const email = profile.email!;
    let user =
      (await this.prisma.user.findUnique({ where: { googleId: profile.sub } })) ??
      (await this.prisma.user.findUnique({ where: { email } }));

    if (user) {
      if (user.deletedAt || user.status !== 'ACTIVE') {
        throw new GoogleAuthError('blocked', `User ${user.id} is not active`);
      }
      if (user.googleId && user.googleId !== profile.sub) {
        throw new GoogleAuthError('failed', `User ${user.id} is linked to another Google account`);
      }
      if (!user.googleId || !user.emailVerifiedAt) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.sub, emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
        });
        this.logger.log(`Google account linked to user ${user.id}`);
      }
      return user;
    }

    try {
      user = await this.prisma.user.create({
        data: {
          email,
          googleId: profile.sub,
          firstName: profile.given_name?.slice(0, 100) || null,
          lastName: profile.family_name?.slice(0, 100) || null,
          emailVerifiedAt: new Date(),
          locale,
          role: 'USER',
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new GoogleAuthError('failed', 'Concurrent Google sign-up');
      }
      throw error;
    }
    this.logger.log(`New user ${user.id} registered with Google`);
    return user;
  }
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
