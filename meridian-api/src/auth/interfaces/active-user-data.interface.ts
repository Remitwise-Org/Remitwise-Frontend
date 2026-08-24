import { Permission } from 'src/auth/enums/permission.enum';
import { Role } from 'src/auth/enums/role.enum';

/**
 * Shape of the claims embedded in the access-token JWT and attached to
 * `request.user` by the AccessTokenGuard (issue #632).
 */
export interface ActiveUserData {
  /** User id — the `sub` claim. */
  sub: number;
  email: string;
  /** Role the token was minted for. */
  role: Role;
  /** Permissions resolved from the role at token-mint time. */
  permissions: Permission[];
  /** Email-verification status at token-mint time. */
  verified: boolean;
}
