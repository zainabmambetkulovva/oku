import { PublicUser } from '../../users/user.mapper';

/** Ответ на регистрацию, вход и обновление токена. Refresh-токен — в cookie. */
export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  accessTokenExpiresAt: string;
}
