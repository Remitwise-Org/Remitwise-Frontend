import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard';
import { AccessTokenGuard } from '../access-token/access-token.guard';
import { Public } from '../../decorators/public/public.decorator';
import { RequireRoles } from '../../decorators/roles/roles.decorator';
import { RequirePermissions } from '../../decorators/permissions/permissions.decorator';
import { Role } from '../../enums/role.enum';
import { Permission } from '../../enums/permission.enum';
import { REQUEST_USER_KEY } from '../../constant/auth-constant';
import { ActiveUserData } from '../../interfaces/active-user-data.interface';

// Decorator metadata is real (SetMetadata) but the constant module is the
// jest virtual mock, which exposes the same keys — so Reflector lookups work.

class FixtureController {
  @Public()
  publicRoute() {}

  @RequireRoles(Role.ADMIN)
  adminOnly() {}

  @RequireRoles(Role.ADMIN, Role.MODERATOR)
  adminOrModerator() {}

  @RequirePermissions(Permission.USERS_MANAGE_ROLES)
  manageRoles() {}

  @RequirePermissions(Permission.USERS_READ, Permission.USERS_UPDATE)
  readAndUpdateUsers() {}

  defaultAuthenticated() {}
}

const makeUser = (overrides: Partial<ActiveUserData> = {}): ActiveUserData => ({
  sub: 1,
  email: 'user@example.com',
  role: Role.USER,
  permissions: [Permission.POSTS_READ],
  verified: true,
  ...overrides,
});

const makeContext = (
  handler: keyof FixtureController,
  user?: ActiveUserData,
): ExecutionContext =>
  ({
    getHandler: () => FixtureController.prototype[handler],
    getClass: () => FixtureController,
    switchToHttp: () => ({ getRequest: () => ({ [REQUEST_USER_KEY]: user }) }),
  }) as unknown as ExecutionContext;

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let accessTokenGuard: { canActivate: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    accessTokenGuard = { canActivate: jest.fn().mockResolvedValue(true) };
    configService = { get: jest.fn().mockReturnValue(true) };
    guard = new RbacGuard(
      new Reflector(),
      accessTokenGuard as unknown as AccessTokenGuard,
      configService as unknown as ConfigService,
    );
  });

  it('allows public routes without a token and skips authentication', async () => {
    await expect(
      guard.canActivate(makeContext('publicRoute')),
    ).resolves.toBe(true);
    expect(accessTokenGuard.canActivate).not.toHaveBeenCalled();
  });

  it('rejects a missing token on a default (authenticated) route', async () => {
    accessTokenGuard.canActivate.mockRejectedValue(new UnauthorizedException());
    await expect(
      guard.canActivate(makeContext('defaultAuthenticated')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('passes a valid token on a default (authenticated) route', async () => {
    await expect(
      guard.canActivate(makeContext('defaultAuthenticated', makeUser())),
    ).resolves.toBe(true);
    expect(accessTokenGuard.canActivate).toHaveBeenCalledTimes(1);
  });

  it('allows the matching role for @RequireRoles(ADMIN)', async () => {
    await expect(
      guard.canActivate(
        makeContext('adminOnly', makeUser({ role: Role.ADMIN })),
      ),
    ).resolves.toBe(true);
  });

  it('rejects a non-matching role for @RequireRoles(ADMIN)', async () => {
    await expect(
      guard.canActivate(
        makeContext('adminOnly', makeUser({ role: Role.VERIFIED_USER })),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows ANY listed role (OR semantics)', async () => {
    await expect(
      guard.canActivate(
        makeContext(
          'adminOrModerator',
          makeUser({ role: Role.MODERATOR }),
        ),
      ),
    ).resolves.toBe(true);
  });

  it('allows when the required permission is held', async () => {
    await expect(
      guard.canActivate(
        makeContext('manageRoles', makeUser({
          role: Role.ADMIN,
          permissions: [Permission.USERS_MANAGE_ROLES],
        })),
      ),
    ).resolves.toBe(true);
  });

  it('rejects when the required permission is missing', async () => {
    await expect(
      guard.canActivate(
        makeContext('manageRoles', makeUser({
          role: Role.MODERATOR,
          permissions: [Permission.USERS_CREATE],
        })),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires ALL listed permissions (AND semantics)', async () => {
    // Holds USERS_READ but not USERS_UPDATE → forbidden.
    await expect(
      guard.canActivate(
        makeContext('readAndUpdateUsers', makeUser({
          permissions: [Permission.USERS_READ, Permission.POSTS_READ],
        })),
      ),
    ).rejects.toThrow(ForbiddenException);

    // Holds both → allowed.
    await expect(
      guard.canActivate(
        makeContext('readAndUpdateUsers', makeUser({
          permissions: [Permission.USERS_READ, Permission.USERS_UPDATE],
        })),
      ),
    ).resolves.toBe(true);
  });

  it('short-circuits everything when RBAC_ENABLED=false (legacy public posture)', async () => {
    configService.get.mockReturnValue(false);
    await expect(
      guard.canActivate(makeContext('adminOnly')),
    ).resolves.toBe(true);
    expect(accessTokenGuard.canActivate).not.toHaveBeenCalled();
  });
});
