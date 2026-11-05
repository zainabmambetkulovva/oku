import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(reflector);
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;

  afterEach(() => jest.restoreAllMocks());

  const withMetadata = (metadata: Record<string, boolean>) =>
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => metadata[key as string] ?? false);

  const httpContext = (headers: Record<string, string>) =>
    ({
      ...context,
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as unknown as ExecutionContext;

  it('lets @Public() routes through without a token', () => {
    withMetadata({ isPublic: true });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('lets guests through @OptionalAuth() routes without a token', () => {
    withMetadata({ isPublic: true, isOptionalAuth: true });
    expect(guard.canActivate(httpContext({}))).toBe(true);
  });

  it('checks the token on @OptionalAuth() routes when it is sent', () => {
    withMetadata({ isPublic: true, isOptionalAuth: true });
    const parent = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);

    guard.canActivate(httpContext({ authorization: 'Bearer token' }));
    expect(parent).toHaveBeenCalled();
  });

  describe('handleRequest', () => {
    it('returns the authenticated user', () => {
      const user = { id: 'u1' };
      expect(guard.handleRequest(null, user, undefined)).toBe(user);
    });

    it('rejects a missing token', () => {
      expect(() => guard.handleRequest(null, false, undefined)).toThrow(
        new UnauthorizedException('Authentication required'),
      );
    });

    it('reports an expired token', () => {
      const expired = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
      expect(() => guard.handleRequest(null, false, expired)).toThrow(
        new UnauthorizedException('Access token expired'),
      );
    });

    it('rethrows HTTP errors from the strategy as is', () => {
      const error = new ForbiddenException('nope');
      expect(() => guard.handleRequest(error, false, undefined)).toThrow(error);
    });
  });
});
