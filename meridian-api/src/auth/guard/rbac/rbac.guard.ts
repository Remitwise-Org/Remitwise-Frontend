import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Global kill-switch (RBAC_ENABLED=false) — behaves like the legacy
    // all-public posture so deployments can roll back without code changes.
    const rbacEnabled = this.configService.get<boolean>('RBAC_ENABLED', true);
    if (rbacEnabled === false) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
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
      const hasRole = requiredRoles.some(
        (role) => user?.role === role,
      );
      if (!hasRole) {
        throw new ForbiddenException(
          `Insufficient role. Requires one of: ${requiredRoles.join(', ')}`,
        );
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
        throw new ForbiddenException(
          `Missing required permission(s): ${missing.join(', ')}`,
        );
      }
    }

    return true;
  }
}
