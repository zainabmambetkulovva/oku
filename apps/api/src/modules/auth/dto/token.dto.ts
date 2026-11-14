import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SITE_LOCALES, type SiteLocale } from '../auth.constants';
import { IsNormalizedEmail, IsStrongPassword } from '../../../common/validation/decorators';

export class VerifyEmailDto {
  /** Токен из ссылки в письме */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  token: string;
}

export class ForgotPasswordDto {
  @IsNormalizedEmail()
  email: string;

  /** Язык страницы, с которой запрошен сброс: на нём придёт письмо */
  @IsOptional()
  @IsIn(SITE_LOCALES)
  locale?: SiteLocale;
}

export class ResendVerificationDto {
  @IsOptional()
  @IsIn(SITE_LOCALES)
  locale?: SiteLocale;
}

export class ResetPasswordDto {
  /** Токен из ссылки в письме */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  token: string;

  @IsStrongPassword()
  password: string;
}
