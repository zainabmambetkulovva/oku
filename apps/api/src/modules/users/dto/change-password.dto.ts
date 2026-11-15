import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validation/decorators';

export class ChangePasswordDto {
  /** Не нужен, если пароля ещё нет (аккаунт создан через Google) */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  currentPassword?: string;

  @IsStrongPassword()
  newPassword: string;
}
