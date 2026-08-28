export const REQUEST_USER_KEY = 'user';

// Legacy binary auth metadata (issue #632 replaces this with RBAC decorators).
export const AUTH_TYPE_kEY = 'authType';

// RBAC metadata keys (issue #632). The RbacGuard reads these off the route
// handler + controller via the Reflector.
export const IS_PUBLIC_KEY = 'isPublic';
export const REQUIRED_ROLES_KEY = 'requiredRoles';
export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
