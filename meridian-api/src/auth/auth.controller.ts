import {
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
} from '@nestjs/swagger';
import { Public } from './decorators/public/public.decorator';
import { REQUEST_USER_KEY } from './constant/auth-constant';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/sign-in')
  @Public()
  @Throttle({ write: { limit: 5, ttl: 15000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with user credentials' })
  @ApiResponse({
    status: 200,
    description:
      'Successfully authenticated, returns access token and refresh token',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid credentials',
  })
  public async signIn(@Body() signInDto: SignInDto) {
    return this.authService.SignIn(signInDto);
  }

  @Post('/refresh-token')
  @Public()
  @Throttle({ write: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh Auth Token' })
  @ApiResponse({ status: 200, description: 'Successfully refreshed token' })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Limit 10 attempts per minute',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid refresh token',
  })
  public async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const userAgent = req.get('user-agent') ?? undefined;
    return this.authService.RefreshToken(refreshTokenDto, userAgent);
  }

  @Post('/logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Successfully revoked refresh token',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / Invalid refresh token',
  })
  public async logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto);
  }

  // Authenticated via the global RbacGuard (default posture) — no @Public().
  @Post('/logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Successfully revoked all sessions',
  })
  public async logoutAll(@Req() req: Request) {
    const user = req[REQUEST_USER_KEY] as { sub?: string | number };
    const userId = Number(user?.sub);

    if (!Number.isFinite(userId)) {
      throw new Error('Invalid user payload');
    }

    return this.authService.logoutAll(userId);
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
    const user = await this.authService.verifyEmail(verifyEmailDto.token);
    return { verified: true, email: user.email };
  }

  @Post('/resend-verification')
  @Public()
  @Throttle({ write: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the email verification mail' })
  @ApiResponse({
    status: 200,
    description:
      'Acknowledgement — never reveals whether the email is registered',
  })
  public async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    return this.authService.resendVerification(resendVerificationDto.email);
  }
}
