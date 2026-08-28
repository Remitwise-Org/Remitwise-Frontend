import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from 'src/auth/constant/auth-constant';

/**
 * Marks a route as publicly accessible — no Bearer token required and the
 * RbacGuard short-circuits before authentication (issue #632).
 *
 * Replaces the legacy `@Auth(AuthType.None)` decorator.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
