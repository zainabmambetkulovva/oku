import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Маршрут доступен только пользователям с одной из указанных ролей. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
