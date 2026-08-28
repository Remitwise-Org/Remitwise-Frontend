import {
  ForbiddenException,
  Injectable,
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

@Injectable()
export class SignInProviders {
  constructor(
    private readonly userAuthFacade: UserAuthFacade,

    //intra dependcy injection of hash provider
    private readonly hashingProvider: HashingProvider,

    // injecting generatetokenprovider
    private readonly generateTokenProvider: GenerateTokenProvider,
  ) {}

  public async SignIn(signInDto: SignInDto) {
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

    const token = await this.generateTokenProvider.generateTokens(user);
    return [token, user];
  }
}
