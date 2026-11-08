import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthThrottle } from '../../common/throttle/auth-throttle.decorator';
import { REFRESH_COOKIE_NAME } from './auth.constants';
import { AuthResult, AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto/token.dto';
import { RefreshCookieService } from './refresh-cookie.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

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
  resendVerification(@AuthUser() user: AuthenticatedUser): Promise<void> {
    return this.auth.resendVerification(user.id);
  }

  /** Запрос ссылки для сброса пароля. Ответ одинаковый для любого e-mail. */
  @Public()
  @AuthThrottle()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.auth.forgotPassword(dto.email);
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
