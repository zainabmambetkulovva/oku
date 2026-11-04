import { ExecutionContext, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Глобальная проверка access-токена. Маршруты с @Public() пропускаются.
 * Сама проверка токена, сессии и статуса пользователя — в JwtStrategy.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(error: unknown, user: TUser | false, info: unknown): TUser {
    if (error instanceof HttpException) {
      throw error;
    }
    if (error || !user) {
      const expired = info instanceof Error && info.name === 'TokenExpiredError';
      throw new UnauthorizedException(expired ? 'Access token expired' : 'Authentication required');
    }
    return user;
  }
}
