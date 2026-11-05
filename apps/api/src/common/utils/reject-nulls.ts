import { BadRequestException } from '@nestjs/common';

/**
 * В DTO изменения все поля необязательны, и class-validator пропускает null.
 * Для обязательных в БД полей null недопустим — отклоняем с понятной ошибкой.
 */
export function rejectNulls<T extends object>(dto: T, fields: readonly (keyof T)[]): void {
  const invalid = fields.filter((field) => dto[field] === null);
  if (invalid.length > 0) {
    throw new BadRequestException({
      message: 'Validation failed',
      details: invalid.map((field) => ({
        field: String(field),
        errors: [`${String(field)} must not be null`],
      })),
    });
  }
}
