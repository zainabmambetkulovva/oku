import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { RolesGuard } from './roles.guard';

const context = (user?: Partial<AuthenticatedUser>) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const requireRoles = (roles?: UserRole[]) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  afterEach(() => jest.restoreAllMocks());

  it('allows routes without @Roles', () => {
    requireRoles(undefined);
    expect(guard.canActivate(context())).toBe(true);
  });

  it('allows a user with a required role', () => {
    requireRoles(['ADMIN']);
    expect(guard.canActivate(context({ role: 'ADMIN' }))).toBe(true);
  });

  it('forbids a user without the required role', () => {
    requireRoles(['ADMIN']);
    expect(() => guard.canActivate(context({ role: 'USER' }))).toThrow(ForbiddenException);
  });

  it('requires authentication for role-protected routes', () => {
    requireRoles(['ADMIN']);
    expect(() => guard.canActivate(context())).toThrow(UnauthorizedException);
  });
});
