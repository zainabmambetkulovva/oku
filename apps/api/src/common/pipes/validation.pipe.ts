import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ValidationErrorDetail } from '../http/api-response';

/**
 * Глобальная валидация входных данных (class-validator).
 *  - whitelist + forbidNonWhitelisted: поля, не описанные в DTO, отклоняются;
 *  - transform: тело и query превращаются в экземпляры DTO; простые параметры
 *    маршрута с типом number/boolean приводятся автоматически.
 *
 * Неявное приведение типов (enableImplicitConversion) намеренно выключено:
 * оно молча превращает 5 в "5", а строку "false" — в true. Числа из query
 * приводятся явно в DTO через @Type(() => Number).
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        message: 'Validation failed',
        details: flattenValidationErrors(errors),
      }),
  });
}

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own: ValidationErrorDetail[] = error.constraints
      ? [{ field, errors: Object.values(error.constraints) }]
      : [];
    const nested = error.children?.length ? flattenValidationErrors(error.children, field) : [];
    return [...own, ...nested];
  });
}
