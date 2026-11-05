import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Public } from './public.decorator';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

/**
 * Маршрут доступен гостям, но если передан access-токен — он проверяется
 * и пользователь попадает в request.user. Неверный или истёкший токен — 401,
 * чтобы клиент обновил токен, а не получил молча ответ для гостя.
 */
export const OptionalAuth = () =>
  applyDecorators(Public(), SetMetadata(IS_OPTIONAL_AUTH_KEY, true));
