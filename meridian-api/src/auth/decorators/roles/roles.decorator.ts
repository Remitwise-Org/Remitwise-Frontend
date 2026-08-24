import { SetMetadata } from '@nestjs/common';
import { REQUIRED_ROLES_KEY } from 'src/auth/constant/auth-constant';
import { Role } from 'src/auth/enums/role.enum';

/**
 * Declares which roles may access a route (issue #632).
 *
 * Semantics: the request is allowed if the authenticated user's role is ANY
 * of the listed roles (OR). The route is always authenticated first — do not
 * combine with `@Public()`.
 *
 * @example @RequireRoles(Role.ADMIN)
 * @example @RequireRoles(Role.ADMIN, Role.MODERATOR)
 */
export const RequireRoles = (...roles: Role[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
