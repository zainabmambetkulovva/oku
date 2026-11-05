import { ExecutionContext, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Глобальная проверка access-токена. Маршруты с @Public() пропускаются;
 * на маршрутах с @OptionalAuth() токен проверяется, только если он передан.
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
    const isOptional = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isOptional) {
      const request = context.switchToHttp().getRequest<Request>();
      return request.headers.authorization ? super.canActivate(context) : true;
    }
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
