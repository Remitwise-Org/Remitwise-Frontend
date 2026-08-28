import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { AuditService } from '../../../audit/audit.service';
import { AuditAction } from '../../../audit/audit-log.entity';
import { CorrelationIdStore } from '../../../common/correlation/correlation-id.store';

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
    switchToHttp: () => ({
      getRequest: () => ({
        [REQUEST_USER_KEY]: user,
        method: 'GET',
        ip: '127.0.0.1',
        route: { path: '/users' },
      }),
    }),
  }) as unknown as ExecutionContext;

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let accessTokenGuard: { canActivate: jest.Mock };
  let configService: { get: jest.Mock };
  let auditService: { log: jest.Mock };
  let correlationIdStore: { get: jest.Mock };

  beforeEach(() => {
    accessTokenGuard = { canActivate: jest.fn().mockResolvedValue(true) };
    configService = { get: jest.fn().mockReturnValue(true) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    correlationIdStore = { get: jest.fn().mockReturnValue('test-corr-id') };
    guard = new RbacGuard(
      new Reflector(),
      accessTokenGuard as unknown as AccessTokenGuard,
      configService as unknown as ConfigService,
      auditService as unknown as AuditService,
      correlationIdStore as unknown as CorrelationIdStore,
    );
  });

  it('allows public routes without a token and skips authentication', async () => {
    await expect(guard.canActivate(makeContext('publicRoute'))).resolves.toBe(
      true,
    );
    expect(accessTokenGuard.canActivate).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
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
        makeContext('adminOrModerator', makeUser({ role: Role.MODERATOR })),
      ),
    ).resolves.toBe(true);
  });

  it('allows when the required permission is held', async () => {
    await expect(
      guard.canActivate(
        makeContext(
          'manageRoles',
          makeUser({
            role: Role.ADMIN,
            permissions: [Permission.USERS_MANAGE_ROLES],
          }),
        ),
      ),
    ).resolves.toBe(true);
  });

  it('rejects when the required permission is missing', async () => {
    await expect(
      guard.canActivate(
        makeContext(
          'manageRoles',
          makeUser({
            role: Role.MODERATOR,
            permissions: [Permission.USERS_CREATE],
          }),
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires ALL listed permissions (AND semantics)', async () => {
    // Holds USERS_READ but not USERS_UPDATE → forbidden.
    await expect(
      guard.canActivate(
        makeContext(
          'readAndUpdateUsers',
          makeUser({
            permissions: [Permission.USERS_READ, Permission.POSTS_READ],
          }),
        ),
      ),
    ).rejects.toThrow(ForbiddenException);

    // Holds both → allowed.
    await expect(
      guard.canActivate(
        makeContext(
          'readAndUpdateUsers',
          makeUser({
            permissions: [Permission.USERS_READ, Permission.USERS_UPDATE],
          }),
        ),
      ),
    ).resolves.toBe(true);
  });

  it('short-circuits everything when RBAC_ENABLED=false (legacy public posture)', async () => {
    configService.get.mockReturnValue(false);
    await expect(guard.canActivate(makeContext('adminOnly'))).resolves.toBe(
      true,
    );
    expect(accessTokenGuard.canActivate).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  // ── Audit parity tests (issue #1678) ────────────────────────────────

  describe('audit logging', () => {
    it('emits AUTHORIZATION_GRANTED on successful authorization', async () => {
      await guard.canActivate(
        makeContext('adminOnly', makeUser({ role: Role.ADMIN })),
      );

      expect(auditService.log).toHaveBeenCalledTimes(1);
      const call = auditService.log.mock.calls[0][0];
      expect(call.action).toBe(AuditAction.AUTHORIZATION_GRANTED);
      expect(call.entityName).toBe('authorization');
      expect(call.performedById).toBe(1);
      expect(call.performedByEmail).toBe('user@example.com');
      expect(call.ipAddress).toBe('127.0.0.1');
      expect(call.newValues).toMatchObject({
        route: 'FixtureController.adminOnly',
        method: 'GET',
        requiredRoles: [Role.ADMIN],
        userRole: Role.ADMIN,
      });
    });

    it('emits AUTHORIZATION_DENIED on role mismatch', async () => {
      await expect(
        guard.canActivate(
          makeContext('adminOnly', makeUser({ role: Role.VERIFIED_USER })),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(auditService.log).toHaveBeenCalledTimes(1);
      const call = auditService.log.mock.calls[0][0];
      expect(call.action).toBe(AuditAction.AUTHORIZATION_DENIED);
      expect(call.entityName).toBe('authorization');
      expect(call.performedById).toBe(1);
      expect(call.ipAddress).toBe('127.0.0.1');
      expect(call.newValues).toMatchObject({
        route: 'FixtureController.adminOnly',
        requiredRoles: [Role.ADMIN],
        userRole: Role.VERIFIED_USER,
      });
      expect(call.newValues.reason).toContain('Insufficient role');
    });

    it('emits AUTHORIZATION_DENIED on missing permissions', async () => {
      await expect(
        guard.canActivate(
          makeContext(
            'manageRoles',
            makeUser({
              role: Role.MODERATOR,
              permissions: [Permission.USERS_CREATE],
            }),
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(auditService.log).toHaveBeenCalledTimes(1);
      const call = auditService.log.mock.calls[0][0];
      expect(call.action).toBe(AuditAction.AUTHORIZATION_DENIED);
      expect(call.newValues).toMatchObject({
        route: 'FixtureController.manageRoles',
        requiredPermissions: [Permission.USERS_MANAGE_ROLES],
        missingPermissions: [Permission.USERS_MANAGE_ROLES],
      });
    });

    it('does not block authorization when audit logging fails', async () => {
      auditService.log.mockRejectedValueOnce(new Error('DB down'));

      await expect(
        guard.canActivate(
          makeContext('adminOnly', makeUser({ role: Role.ADMIN })),
        ),
      ).resolves.toBe(true);
    });

    it('does not block denial when audit logging fails', async () => {
      auditService.log.mockRejectedValueOnce(new Error('DB down'));

      await expect(
        guard.canActivate(
          makeContext('adminOnly', makeUser({ role: Role.VERIFIED_USER })),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('skips audit for public routes', async () => {
      await guard.canActivate(makeContext('publicRoute'));

      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('skips audit when RBAC is disabled', async () => {
      configService.get.mockReturnValue(false);

      await guard.canActivate(makeContext('adminOnly'));

      expect(auditService.log).not.toHaveBeenCalled();
    });
  });
});
