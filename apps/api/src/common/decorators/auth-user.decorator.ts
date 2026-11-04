import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Возвращает пользователя, которого JwtStrategy положила в request.user.
 * Работает только на маршрутах, защищённых JWT-guard (появится в этапе Б3).
 */
export const AuthUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
