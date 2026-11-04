import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { IsPhone, Trim } from '../../../common/validation/decorators';

/**
 * Изменение профиля. E-mail, роль и статус здесь менять нельзя:
 * лишние поля отклоняются глобальной валидацией.
 */
export class UpdateProfileDto {
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

  /** null — удалить телефон */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsPhone()
  phone?: string | null;
}
