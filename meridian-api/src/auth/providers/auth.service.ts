import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignInDto } from '../dto/sign-in.dto';
import { SignInProviders } from './sign-in.providers';
import { RefreshTokenDto } from '../dto/refresh-token-dto';
import { RefreshTokenProvider } from './refreshToken.provider';
import { VerifyEmailProvider } from './verify-email.provider';
import { User } from 'src/users/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    //intra dependency injection of sigin Providers
    private readonly signInProviders: SignInProviders,

    private readonly refreshTokenProvider: RefreshTokenProvider,

    // Email-verification flow (issue #435): issues tokens and consumes them
    // when the recipient clicks the link from their signup mail.
    private readonly verifyEmailProvider: VerifyEmailProvider,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  public async SignIn(signInDto: SignInDto) {
    // find user in database by email
    return await this.signInProviders.SignIn(signInDto);
  }

  /**
   * Email-verification (issue #435): consume a raw verification token from
   * the signup mail. Delegates to VerifyEmailProvider for the heavy lifting
   * (lookup / match / cleanup).
   */
  public async verifyEmail(token: string) {
    return await this.verifyEmailProvider.verifyEmail(token);
  }

  /**
   * Email-verification (issue #435): re-issue a fresh verification token
   * for the given email if the account exists and is not already verified.
   * Always returns the same acknowledgement so callers cannot enumerate
   * which emails belong to a registered account.
   */
  public async resendVerification(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email },
      withDeleted: false,
    });

    if (user && !user.emailVerified) {
      try {
        await this.verifyEmailProvider.issueVerificationToken(user);
      } catch (error) {
        this.logger.error(
          `Failed to reissue verification token for ${email}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    return {
      status: 'ok',
      message:
        'If that email belongs to an unverified account, a new verification email has been sent.',
    };
  }

  public async RefreshToken(
    refreshTokendto: RefreshTokenDto,
    userAgent?: string,
  ) {
    return await this.refreshTokenProvider.refreshToken(
      refreshTokendto,
      userAgent,
    );
  }

  public async logout(refreshTokendto: RefreshTokenDto) {
    return await this.refreshTokenProvider.logout(refreshTokendto);
  }

  public async logoutAll(userId: number) {
    return await this.refreshTokenProvider.logoutAll(userId);
  }
}
