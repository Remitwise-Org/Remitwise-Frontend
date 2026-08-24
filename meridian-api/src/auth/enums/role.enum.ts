/**
 * User roles (issue #632).
 *
 * Ordered from least to most privileged. Every role maps to a fixed set of
 * permissions via `ROLE_PERMISSIONS` in `role-permissions.ts`; the JWT carries
 * both the role and its resolved permissions so the RbacGuard never touches
 * the database at request time.
 */
export enum Role {
  /** Regular signed-up user (email may still be unverified). */
  USER = 'user',
  /** Email-verified user (promoted automatically on email verification). */
  VERIFIED_USER = 'verified_user',
  /** Can create/update users; cannot delete users or manage roles. */
  MODERATOR = 'moderator',
  /** Full access, including audit review and role management. */
  ADMIN = 'admin',
}
