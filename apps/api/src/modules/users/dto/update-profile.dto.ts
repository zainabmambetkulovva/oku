import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { SITE_LOCALES, type SiteLocale } from '../../auth/auth.constants';
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

  /** Язык писем и уведомлений: ru или ky */
  @IsOptional()
  @IsIn(SITE_LOCALES)
  locale?: SiteLocale;
}
