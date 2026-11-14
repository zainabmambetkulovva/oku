import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthThrottle } from '../../common/throttle/auth-throttle.decorator';
import { Env } from '../../config/env';
import {
  GOOGLE_FLOW_COOKIE,
  GOOGLE_FLOW_COOKIE_PATH,
  GOOGLE_FLOW_TTL_MS,
  REFRESH_COOKIE_NAME,
  toSiteLocale,
} from './auth.constants';
import { AuthResult, AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ForgotPasswordDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/token.dto';
import {
  GoogleAuthError,
  GoogleAuthService,
  type GoogleFlowState,
  safeNextPath,
} from './google-auth.service';
import { RefreshCookieService } from './refresh-cookie.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly frontendUrl: string;
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: AuthService,
    private readonly refreshCookie: RefreshCookieService,
    private readonly google: GoogleAuthService,
    config: ConfigService<Env, true>,
  ) {
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true }).replace(/\/+$/, '');
    this.secureCookies = config.get('COOKIE_SECURE', { infer: true });
  }

  // ─── Вход через Google ─────────────────────────────────────────────────────

  /** Переход на страницу выбора аккаунта Google. ?locale=ru|ky&next=/ru/books */
  @Public()
  @AuthThrottle()
  @ApiExcludeEndpoint()
  @Get('google')
  googleStart(@Req() req: Request, @Res() res: Response): void {
    const locale = toSiteLocale(String(req.query.locale ?? ''));
    const next = safeNextPath(req.query.next);
    try {
      const { url, flow } = this.google.start(locale, next);
      res.cookie(GOOGLE_FLOW_COOKIE, Buffer.from(JSON.stringify(flow)).toString('base64url'), {
        httpOnly: true,
        secure: this.secureCookies,
        // lax: cookie должна вернуться при переходе обратно с accounts.google.com
        sameSite: 'lax',
        path: GOOGLE_FLOW_COOKIE_PATH,
        maxAge: GOOGLE_FLOW_TTL_MS,
      });
      res.redirect(302, url);
    } catch (error) {
      res.redirect(302, this.googleFailureUrl(locale, error));
    }
  }

  /** Google возвращает сюда пользователя с кодом авторизации. */
  @Public()
  @AuthThrottle()
  @ApiExcludeEndpoint()
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const flow = this.readGoogleFlow(req);
    const locale = flow?.locale ?? 'ru';
    res.clearCookie(GOOGLE_FLOW_COOKIE, { path: GOOGLE_FLOW_COOKIE_PATH });
    try {
      const user = await this.google.finish(req.query, flow, locale);
      const result = await this.auth.signIn(user.id);
      this.refreshCookie.set(res, result.session.refreshToken, result.session.session.expiresAt);
      const next = flow?.next ? `?next=${encodeURIComponent(flow.next)}` : '';
      res.redirect(302, `${this.frontendUrl}/${locale}/auth/callback${next}`);
    } catch (error) {
      res.redirect(302, this.googleFailureUrl(locale, error));
    }
  }

  private readGoogleFlow(req: Request): GoogleFlowState | null {
    const raw: unknown = req.cookies?.[GOOGLE_FLOW_COOKIE];
    if (typeof raw !== 'string') return null;
    try {
      const flow = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as GoogleFlowState;
      return typeof flow.state === 'string' && typeof flow.verifier === 'string'
        ? { ...flow, locale: toSiteLocale(flow.locale), next: safeNextPath(flow.next) }
        : null;
    } catch {
      return null;
    }
  }

  private googleFailureUrl(locale: string, error: unknown): string {
    const reason = error instanceof GoogleAuthError ? error.reason : 'failed';
    if (!(error instanceof GoogleAuthError) || reason === 'failed') {
      this.logger.warn(`Google sign-in failed: ${error instanceof Error ? error.message : error}`);
    }
    return `${this.frontendUrl}/${locale}/login?error=google_${reason}`;
  }

  /** Регистрация. Возвращает access-токен, refresh-токен — в httpOnly cookie. */
  @Public()
  @AuthThrottle()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.register(dto));
  }

  /** Вход по e-mail и паролю. */
  @Public()
  @AuthThrottle()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.login(dto));
  }

  /** Новый access-токен по refresh-токену из cookie. Refresh-токен при этом меняется. */
  @Public()
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const token = this.refreshCookie.read(req);
    if (!token) {
      throw new UnauthorizedException('Refresh token is missing');
    }
    try {
      return this.respond(res, await this.auth.refresh(token));
    } catch (error) {
      this.refreshCookie.clear(res);
      throw error;
    }
  }

  /** Выход с текущего устройства. Работает и с истёкшим access-токеном. */
  @Public()
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = this.refreshCookie.read(req);
    if (token) {
      await this.auth.logout(token);
    }
    this.refreshCookie.clear(res);
  }

  /** Выход со всех устройств. */
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @AuthUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logoutAll(user.id);
    this.refreshCookie.clear(res);
  }

  /** Подтверждение e-mail по токену из письма. */
  @Public()
  @AuthThrottle()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    return this.auth.verifyEmail(dto.token);
  }

  /** Повторная отправка письма для подтверждения e-mail. */
  @ApiBearerAuth()
  @AuthThrottle()
  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  resendVerification(
    @AuthUser() user: AuthenticatedUser,
    @Body() dto: ResendVerificationDto,
  ): Promise<void> {
    return this.auth.resendVerification(user.id, dto.locale);
  }

  /** Запрос ссылки для сброса пароля. Ответ одинаковый для любого e-mail. */
  @Public()
  @AuthThrottle()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.auth.forgotPassword(dto.email, dto.locale);
  }

  /** Новый пароль по токену из письма. Завершает все сессии пользователя. */
  @Public()
  @AuthThrottle()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  private respond(res: Response, result: AuthResult): AuthResponse {
    this.refreshCookie.set(res, result.session.refreshToken, result.session.session.expiresAt);
    return result.response;
  }
}
