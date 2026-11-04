import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { Env } from '../../config/env';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from './auth.constants';

/**
 * Refresh-токен передаётся только в httpOnly cookie: JavaScript страницы не может
 * его прочитать, поэтому XSS не украдёт долгоживущий токен.
 */
@Injectable()
export class RefreshCookieService {
  private readonly options: CookieOptions;

  constructor(config: ConfigService<Env, true>) {
    this.options = {
      httpOnly: true,
      secure: config.get('COOKIE_SECURE', { infer: true }),
      sameSite: config.get('COOKIE_SAMESITE', { infer: true }),
      path: REFRESH_COOKIE_PATH,
    };
  }

  set(response: Response, refreshToken: string, expiresAt: Date): void {
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, { ...this.options, expires: expiresAt });
  }

  clear(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, this.options);
  }

  read(request: Request): string | undefined {
    const value: unknown = request.cookies?.[REFRESH_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
