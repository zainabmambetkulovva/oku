import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsNormalizedEmail, IsStrongPassword, Trim } from '../../../common/validation/decorators';

export class RegisterDto {
  /** @example reader@oku24.kg */
  @IsNormalizedEmail()
  email: string;

  /** Не короче 8 символов, хотя бы одна буква и одна цифра */
  @IsStrongPassword()
  password: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
