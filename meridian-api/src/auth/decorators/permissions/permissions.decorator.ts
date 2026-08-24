import { SetMetadata } from '@nestjs/common';
import { REQUIRED_PERMISSIONS_KEY } from 'src/auth/constant/auth-constant';
import { Permission } from 'src/auth/enums/permission.enum';

/**
 * Declares which permissions a route requires (issue #632).
 *
 * Semantics: the request is allowed only if the authenticated user holds ALL
 * of the listed permissions (AND). The route is always authenticated first —
 * do not combine with `@Public()`.
 *
 * @example @RequirePermissions(Permission.AUDIT_READ)
 * @example @RequirePermissions(Permission.USERS_READ, Permission.USERS_UPDATE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
