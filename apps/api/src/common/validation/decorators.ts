import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsByteLength, IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt учитывает только первые 72 байта пароля — длиннее не принимаем */
export const PASSWORD_MAX_BYTES = 72;

/** Убирает пробелы по краям строки. */
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** E-mail: обрезка пробелов, нижний регистр, проверка формата. */
export const IsNormalizedEmail = () =>
  applyDecorators(
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    IsEmail({}, { message: 'email must be a valid e-mail address' }),
    MaxLength(254),
  );

/** Пароль: от 8 символов, не больше 72 байт, хотя бы одна буква и одна цифра. */
export const IsStrongPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
    }),
    IsByteLength(0, PASSWORD_MAX_BYTES, {
      message: `password must be at most ${PASSWORD_MAX_BYTES} bytes long`,
    }),
    Matches(/\p{L}/u, { message: 'password must contain at least one letter' }),
    Matches(/\d/, { message: 'password must contain at least one digit' }),
  );

/** Телефон: цифры, пробелы, дефисы, скобки и необязательный «+» в начале. */
export const IsPhone = () =>
  applyDecorators(
    Trim(),
    IsString(),
    Matches(/^\+?[0-9\s\-()]{7,20}$/, { message: 'phone must be a valid phone number' }),
  );
