import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import jwtConfig from 'src/auth/config/jwt.config';
import { REQUEST_USER_KEY } from 'src/auth/constant/auth-constant';
import { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService, //dependency injection for jwt service
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    //A. Extract the request from the execution context
    const request = context.switchToHttp().getRequest();
    // B. Extract the token from the header
    const token = this.extractRequestFromHeader(request);
    // C. Validate the token
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(
        token,
        this.jwtConfiguration,
      );
      // Attach the full claims object (sub, email, role, permissions,
      // verified) to request.user (issue #632) so the RbacGuard and
      // controllers can authorize without re-decoding the token.
      request[REQUEST_USER_KEY] = payload as ActiveUserData;
    } catch (error) {
      throw new UnauthorizedException('error');
    }
    return true;
  }

  private extractRequestFromHeader(request: Request) {
    const [_, token] = request.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
