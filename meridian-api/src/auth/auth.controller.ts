import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './providers/auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token-dto';
import { LogoutDto } from './dto/logout.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Public } from './decorators/public/public.decorator';
import { REQUEST_USER_KEY } from './constant/auth-constant';
import { Request } from 'express';

/**
 * Accepted idempotency header names (case-insensitive lookup by Express).
 * `idempotency-key` is the canonical name; `x-idempotency-key` is accepted
 * for compatibility with clients that prefix custom headers.
 */
const IDEMPOTENCY_HEADERS = ['idempotency-key', 'x-idempotency-key'] as const;

/** Hard limit for idempotency keys (mirrored in AuthService). */
const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

/**
 * Extract and validate the caller-supplied idempotency key, if any.
 *
 * Client retry contract (issue #1689):
 *  - No header  → operation executes directly (pre-existing behavior).
 *  - Same key + same body  → the stored response is replayed for the TTL;
 *    the operation is NOT executed twice.
 *  - Same key + different body → 409 Conflict, zero state change.
 *  - Malformed key (empty/oversized) → 400 Bad Request.
 */
function extractIdempotencyKey(req: Request): string | undefined {
  for (const header of IDEMPOTENCY_HEADERS) {
    const raw = req.get(header);
    if (raw !== undefined) {
      const key = raw.trim();
      if (key.length === 0) {
        throw new BadRequestException(
          'Idempotency-Key header must not be empty',
        );
      }
      if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
        throw new BadRequestException(
          `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
        );
      }
      return key;
    }
  }
  return undefined;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/sign-in')
  @Public()
  @Throttle({ write: { limit: 5, ttl: 15000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with user credentials' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description:
      'Optional. Retry of the same body with the same key replays the stored response instead of minting a second session.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Successfully authenticated, returns access token and refresh token',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid credentials',
  })
  @ApiResponse({
    status: 409,
    description:
      'Idempotency-Key reused with a different request payload (no state changed)',
  })
  public async signIn(@Body() signInDto: SignInDto, @Req() req: Request) {
    return this.authService.SignIn(signInDto, extractIdempotencyKey(req));
  }

  @Post('/refresh-token')
  @Public()
  @Throttle({ write: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh Auth Token' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description:
      'Optional. Concurrent/retried rotations with the same key share one execution and one response — recommended for multi-tab clients.',
  })
  @ApiResponse({ status: 200, description: 'Successfully refreshed token' })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Limit 10 attempts per minute',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized / Invalid refresh token — do NOT retry with the same refresh token; it has been consumed or revoked',
  })
  public async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const userAgent = req.get('user-agent') ?? undefined;
    return this.authService.RefreshToken(
      refreshTokenDto,
      userAgent,
      extractIdempotencyKey(req),
    );
  }

  @Post('/logout')
  @Public()
  @Throttle({ write: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional. Retried logouts replay the same acknowledgement.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully revoked refresh token (idempotent)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid refresh token',
  })
  public async logout(@Body() logoutDto: LogoutDto, @Req() req: Request) {
    return this.authService.logout(logoutDto, extractIdempotencyKey(req));
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Limit 10 attempts per minute',
  })
  public async logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto);
  }

  // Authenticated via the global RbacGuard (default posture) — no @Public().
  @Post('/logout-all')
  @Throttle({ write: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional. Retried logout-all calls replay the same response.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully revoked all sessions',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Limit 5 attempts per minute',
  })
  public async logoutAll(@Req() req: Request) {
    const user = req[REQUEST_USER_KEY] as { sub?: string | number };
    const userId = Number(user?.sub);

    if (!Number.isFinite(userId)) {
      throw new BadRequestException('Invalid user payload');
    }

    return this.authService.logoutAll(userId, extractIdempotencyKey(req));
  }

  @Post('/verify-email')
  @Public()
  @Throttle({ write: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email with one-time token from signup mail',
  })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired verification token',
  })
  public async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    // Idempotency here is implicit: the raw token IS the operation key
    // (hashed inside AuthService), so no caller header is required.
    const user = await this.authService.verifyEmail(verifyEmailDto.token);
    return { verified: true, email: user.email };
  }

  @Post('/resend-verification')
  @Public()
  @Throttle({ write: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the email verification mail' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description:
      'Optional. Bounds a resend to one mail per key — protects against double-clicks and retries.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Acknowledgement — never reveals whether the email is registered',
  })
  public async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
    @Req() req: Request,
  ) {
    return this.authService.resendVerification(
      resendVerificationDto.email,
      extractIdempotencyKey(req),
    );
  }
}
