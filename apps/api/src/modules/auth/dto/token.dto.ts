import { IsString, MaxLength, MinLength } from 'class-validator';
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
