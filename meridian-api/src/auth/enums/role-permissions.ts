import { Permission } from './permission.enum';
import { Role } from './role.enum';

/**
 * Static role → permissions matrix (issue #632).
 *
 * This is the single source of truth used by the token provider to embed a
 * user's permission list into the access-token JWT. Keep this table in sync
 * with the `@RequirePermissions` / `@RequireRoles` decorators on controllers.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.USER]: [
    Permission.POSTS_READ,
    Permission.POSTS_CREATE,
    Permission.POSTS_UPDATE,
    Permission.POSTS_DELETE,
    Permission.UPLOAD_CREATE,
    Permission.LEADERBOARD_READ,
  ],
  [Role.VERIFIED_USER]: [
    Permission.USERS_READ,
    Permission.POSTS_READ,
    Permission.POSTS_CREATE,
    Permission.POSTS_UPDATE,
    Permission.POSTS_DELETE,
    Permission.UPLOAD_CREATE,
    Permission.LEADERBOARD_READ,
  ],
  [Role.MODERATOR]: [
    Permission.USERS_READ,
    Permission.USERS_CREATE,
    Permission.USERS_UPDATE,
    Permission.POSTS_READ,
    Permission.POSTS_CREATE,
    Permission.POSTS_UPDATE,
    Permission.POSTS_DELETE,
    Permission.UPLOAD_CREATE,
    Permission.LEADERBOARD_READ,
  ],
  [Role.ADMIN]: [
    Permission.USERS_READ,
    Permission.USERS_CREATE,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
    Permission.USERS_MANAGE_ROLES,
    Permission.POSTS_READ,
    Permission.POSTS_CREATE,
    Permission.POSTS_UPDATE,
    Permission.POSTS_DELETE,
    Permission.UPLOAD_CREATE,
    Permission.LEADERBOARD_READ,
    Permission.AUDIT_READ,
  ],
};
