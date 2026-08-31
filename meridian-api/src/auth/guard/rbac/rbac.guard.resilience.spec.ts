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

// Storage / migration compatibility resilience for the admin/operational
// surface (issue #1679): a failed or degraded audit store must never leave a
// partial/unauthorized state, and repeated/replayed decisions must not create
// duplicate audit records.

class FixtureController {
  @Public()
  publicRoute() {}

  @RequireRoles(Role.ADMIN)
  adminOnly() {}

  @RequirePermissions(Permission.USERS_MANAGE_ROLES)
  manageRoles() {}
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

describe('RbacGuard — storage/migration compatibility resilience (issue #1679)', () => {
  let guard: RbacGuard;
  let accessTokenGuard: { canActivate: jest.Mock };
  let configService: { get: jest.Mock };
  let auditService: { log: jest.Mock };
  let correlationIdStore: { get: jest.Mock };

  beforeEach(() => {
    accessTokenGuard = { canActivate: jest.fn().mockResolvedValue(true) };
    configService = { get: jest.fn().mockReturnValue(true) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    correlationIdStore = { get: jest.fn().mockReturnValue('corr-1') };
    guard = new RbacGuard(
      new Reflector(),
      accessTokenGuard as unknown as AccessTokenGuard,
      configService as unknown as ConfigService,
      auditService as unknown as AuditService,
      correlationIdStore as unknown as CorrelationIdStore,
    );
  });

  it('still denies when the audit store is unavailable (no partial state)', async () => {
    auditService.log.mockRejectedValueOnce(new Error('DB unreachable'));

    await expect(
      guard.canActivate(
        makeContext('adminOnly', makeUser({ role: Role.VERIFIED_USER })),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(auditService.log).toHaveBeenCalledTimes(1);
  });

  it('still allows when the audit store is unavailable (no partial state)', async () => {
    auditService.log.mockRejectedValueOnce(new Error('DB unreachable'));

    await expect(
      guard.canActivate(
        makeContext('adminOnly', makeUser({ role: Role.ADMIN })),
      ),
    ).resolves.toBe(true);

    expect(auditService.log).toHaveBeenCalledTimes(1);
  });

  it('emits a degraded_mode marker when the audit write fails', async () => {
    const warnSpy = jest
      .spyOn((guard as any).logger, 'warn')
      .mockImplementation();
    const errorSpy = jest
      .spyOn((guard as any).logger, 'error')
      .mockImplementation();
    auditService.log.mockRejectedValueOnce(new Error('DB unreachable'));

    await guard.canActivate(
      makeContext('adminOnly', makeUser({ role: Role.ADMIN })),
    );

    const degraded = warnSpy.mock.calls.find((c) =>
      String(c[0]).includes('audit.degraded_mode'),
    );
    expect(degraded).toBeDefined();
    expect(
      errorSpy.mock.calls.some((c) =>
        String(c[0]).includes('audit.write_failed'),
      ),
    ).toBe(true);
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('collapses repeated/replayed identical decisions into a single audit record', async () => {
    const ctx = makeContext('adminOnly', makeUser({ role: Role.ADMIN }));
    await guard.canActivate(ctx);
    await guard.canActivate(ctx); // replayed identical request
    await guard.canActivate(ctx); // replayed identical request

    expect(auditService.log).toHaveBeenCalledTimes(1);
    const call = auditService.log.mock.calls[0][0];
    expect(call.action).toBe(AuditAction.AUTHORIZATION_GRANTED);
  });

  it('still records distinct decisions separately (no over-deduplication)', async () => {
    await guard.canActivate(
      makeContext('adminOnly', makeUser({ role: Role.ADMIN })),
    );
    await expect(
      guard.canActivate(
        makeContext('adminOnly', makeUser({ role: Role.VERIFIED_USER })),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(auditService.log).toHaveBeenCalledTimes(2);
  });

  it('stamps the audit record with the current schema version (forward compat)', async () => {
    await guard.canActivate(
      makeContext('adminOnly', makeUser({ role: Role.ADMIN })),
    );

    const call = auditService.log.mock.calls[0][0];
    expect(call.newValues).toMatchObject({ schemaVersion: 4 });
  });

  it('skips audit entirely for public routes even under degraded storage', async () => {
    const errorSpy = jest
      .spyOn((guard as any).logger, 'error')
      .mockImplementation();
    await guard.canActivate(makeContext('publicRoute'));
    expect(auditService.log).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('rejects a missing token before any audit work (no stale state)', async () => {
    accessTokenGuard.canActivate.mockRejectedValue(new UnauthorizedException());
    await expect(guard.canActivate(makeContext('adminOnly'))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
