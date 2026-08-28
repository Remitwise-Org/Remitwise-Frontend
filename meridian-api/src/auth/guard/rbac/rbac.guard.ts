import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AccessTokenGuard } from 'src/auth/guard/access-token/access-token.guard';
import {
  IS_PUBLIC_KEY,
  REQUEST_USER_KEY,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY,
} from 'src/auth/constant/auth-constant';
import { Permission } from 'src/auth/enums/permission.enum';
import { Role } from 'src/auth/enums/role.enum';
import { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/audit-log.entity';
import { CorrelationIdStore } from 'src/common/correlation/correlation-id.store';

/**
 * Global RBAC guard (issue #632).
 *
 * Replaces the coarse binary `AuthType` (Bearer/None) decorator pattern with
 * controller-level metadata evaluated against role/permission claims carried
 * in the access-token JWT:
 *
 *   - `@Public()`              → no token required, guard short-circuits.
 *   - `@RequireRoles(...)`     → authenticated user's role must match ANY.
 *   - `@RequirePermissions(...)` → authenticated user must hold ALL.
 *   - no metadata (default)    → any valid Bearer token is enough.
 *
 * Runs as an APP_GUARD before controllers; delegates token verification to
 * the AccessTokenGuard so request.user gets the typed ActiveUserData claims.
 *
 * Emits audit records for every authorization decision (grant or deny) so
 * privileged workflows are deterministically traceable. Audit failures are
 * caught and logged — they never block the authorization flow.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly correlationIdStore: CorrelationIdStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Global kill-switch (RBAC_ENABLED=false) — behaves like the legacy
    // all-public posture so deployments can roll back without code changes.
    const rbacEnabled = this.configService.get<boolean>('RBAC_ENABLED', true);
    if (rbacEnabled === false) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 1. Authenticate: throws UnauthorizedException when the token is missing
    // or invalid, and attaches the typed claims to request.user.
    const authenticated = await this.accessTokenGuard.canActivate(context);
    if (!authenticated) {
      throw new UnauthorizedException('Invalid or missing access token');
    }

    const request = context.switchToHttp().getRequest();
    const user = request[REQUEST_USER_KEY] as ActiveUserData | undefined;

    // 2. Role check (OR semantics).
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles?.length) {
      const hasRole = requiredRoles.some((role) => user?.role === role);
      if (!hasRole) {
        const reason = `Insufficient role. Requires one of: ${requiredRoles.join(', ')}`;
        await this.logAuditDecision(
          AuditAction.AUTHORIZATION_DENIED,
          context,
          user,
          request,
          reason,
          { requiredRoles },
        );
        throw new ForbiddenException(reason);
      }
    }

    // 3. Permission check (AND semantics).
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredPermissions?.length) {
      const userPermissions = user?.permissions ?? [];
      const missing = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );
      if (missing.length > 0) {
        const reason = `Missing required permission(s): ${missing.join(', ')}`;
        await this.logAuditDecision(
          AuditAction.AUTHORIZATION_DENIED,
          context,
          user,
          request,
          reason,
          { requiredPermissions, missingPermissions: missing },
        );
        throw new ForbiddenException(reason);
      }
    }

    // Authorization granted — emit audit record for privileged endpoints.
    await this.logAuditDecision(
      AuditAction.AUTHORIZATION_GRANTED,
      context,
      user,
      request,
      'Authorized',
      {
        requiredRoles: requiredRoles ?? null,
        requiredPermissions: requiredPermissions ?? null,
      },
    );

    return true;
  }

  /**
   * Fire-and-forget audit logging. Failures are caught and logged but never
   * propagate — the authorization decision is always the primary concern.
   */
  private async logAuditDecision(
    action: AuditAction,
    context: ExecutionContext,
    user: ActiveUserData | undefined,
    request: { ip?: string; method?: string; route?: { path?: string } },
    reason: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      const handler = context.getHandler();
      const controllerClass = context.getClass();
      const route = `${controllerClass.name}.${handler.name}`;
      const method = request.method ?? 'UNKNOWN';
      const routePath = request.route?.path ?? 'unknown';

      await this.auditService.log({
        entityName: 'authorization',
        entityId: user?.sub != null ? String(user.sub) : null,
        action,
        performedById: user?.sub != null ? Number(user.sub) : null,
        performedByEmail: user?.email ?? null,
        ipAddress: request.ip ?? null,
        newValues: {
          route,
          method,
          routePath,
          reason,
          requiredRoles: details['requiredRoles'] ?? null,
          requiredPermissions: details['requiredPermissions'] ?? null,
          missingPermissions: details['missingPermissions'] ?? null,
          userRole: user?.role ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          msg: 'audit.write_failed',
          action,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
