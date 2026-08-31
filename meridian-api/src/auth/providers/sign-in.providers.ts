import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInDto } from '../dto/sign-in.dto';
import { UserAuthFacade } from 'src/users/providers/user-auth.facade';
import { HashingProvider } from './hashing';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { GenerateTokenProvider } from './token.provider';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-log.entity';
import { AccountLockoutService } from './account-lockout.service';

@Injectable()
export class SignInProviders {
  private readonly logger = new Logger(SignInProviders.name);

  constructor(
    private readonly userAuthFacade: UserAuthFacade,

    //intra dependcy injection of hash provider
    private readonly hashingProvider: HashingProvider,

    // injecting generatetokenprovider
    private readonly generateTokenProvider: GenerateTokenProvider,

    private readonly auditService: AuditService,

    /** Account lockout: tracks failed sign-in attempts per email. */
    private readonly lockoutService: AccountLockoutService,
  ) {}

  public async SignIn(signInDto: SignInDto) {
    // -- Account lockout check (issue #1651) ----------------------------
    const retryAfterMs = this.lockoutService.isLocked(signInDto.email);
    if (retryAfterMs !== null) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      throw new HttpException(
        `Account temporarily locked due to too many failed attempts. Retry after ${retryAfterSec}s.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // find user by email
    const user = await this.userAuthFacade.findUserByEmail(signInDto.email);

    //compare the password to the hashed password
    let isEqual: boolean = false;
    try {
      isEqual = await this.hashingProvider.comparePassword(
        signInDto.password,
        user.password,
      );
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'error connecting to database',
      });
    }

    //send a confirmation
    if (!isEqual) {
      // Record the failed attempt (issue #1651).
      const lockedMs = this.lockoutService.recordFailure(signInDto.email);
      if (lockedMs !== null) {
        const retryAfterSec = Math.ceil(lockedMs / 1000);
        this.logger.warn(
          `Account locked after failed sign-in: ${signInDto.email} — retry after ${retryAfterSec}s`,
        );
        throw new HttpException(
          `Account temporarily locked due to too many failed attempts. Retry after ${retryAfterSec}s.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('password/email is wrong');
    }

    // Email-verification gate (issue #435): we deliberately reject AFTER the
    // password match so a successful sign-in only happens for verified users.
    // The 403 wording is intentionally generic so the response cannot be
    // used to enumerate which emails have been registered.
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email before signing in.',
      );
    }

    // -- Successful sign-in: reset lockout counter (issue #1651) ---------
    this.lockoutService.recordSuccess(signInDto.email);

    const token = await this.generateTokenProvider.generateTokens(user);

    await this.auditService.log({
      entityName: 'User',
      entityId: user.id,
      action: AuditAction.SIGN_IN,
      performedById: user.id,
      performedByEmail: user.email,
    });

    return [token, user];
  }
}
