/**
 * Fine-grained permissions (issue #632).
 *
 * Permissions are derived from a user's role (see `ROLE_PERMISSIONS`) and
 * embedded in the JWT so the RbacGuard can evaluate them statelessly.
 * Each permission follows an `<resource>:<action>` convention.
 */
export enum Permission {
  // ---- users ----
  /** View user records (list / find). */
  USERS_READ = 'users:read',
  /** Create users (POST /users). Granted to moderators + admins. */
  USERS_CREATE = 'users:create',
  /** Update user records. */
  USERS_UPDATE = 'users:update',
  /** Delete (soft-delete) users. Admin only. */
  USERS_DELETE = 'users:delete',
  /** Assign roles to users (admin-only endpoints). */
  USERS_MANAGE_ROLES = 'users:manage-roles',

  // ---- posts ----
  /** Create a post (POST /posts). Any authenticated user. */
  POSTS_CREATE = 'posts:create',
  /** Read posts. */
  POSTS_READ = 'posts:read',
  /** Update a post. */
  POSTS_UPDATE = 'posts:update',
  /** Delete a post. */
  POSTS_DELETE = 'posts:delete',

  // ---- uploads ----
  /** Upload a file asset (POST /upload). Any authenticated user. */
  UPLOAD_CREATE = 'upload:create',

  // ---- leaderboard ----
  /** Read the public leaderboard (public endpoint, no auth). */
  LEADERBOARD_READ = 'leaderboard:read',

  // ---- audit ----
  /** Review audit logs (admin only). */
  AUDIT_READ = 'audit:read',
}
