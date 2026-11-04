import { UserRole } from '@prisma/client';

/** Пользователь текущего запроса. Кладётся в request.user стратегией JWT. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  /** Сессия, к которой привязан access-токен */
  sessionId: string;
}

/** Содержимое access-токена. */
export interface AccessTokenPayload {
  /** id пользователя */
  sub: string;
  /** id сессии */
  sid: string;
}
