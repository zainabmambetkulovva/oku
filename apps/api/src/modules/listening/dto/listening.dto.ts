import {
  IsBoolean,
  IsEmail,
  IsISO8601,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SaveProgressDto {
  @IsUUID()
  chapterId: string;

  /** Позиция в главе, секунды. Не больше длительности главы */
  @IsInt()
  @Min(0)
  @Max(24 * 60 * 60)
  positionSeconds: number;

  /** Аудиокнига прослушана до конца */
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class GrantAccessDto {
  /** E-mail пользователя, которому выдаётся доступ */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  /** Окончание доступа. Не указано — бессрочно */
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
