import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Маршрут доступен без авторизации.
 * По умолчанию все маршруты закрыты (глобальный JwtAuthGuard).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
