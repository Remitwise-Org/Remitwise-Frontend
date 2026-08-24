import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerException } from '@nestjs/throttler';
import { RateLimitService } from '../../rate-limit/rate-limit.service';
import {
  RATE_LIMIT_HEADERS,
  RateLimitTier,
  WRITE_METHODS,
} from '../../rate-limit/rate-limit.constants';
import { REQUEST_USER_KEY } from '../../auth/constant/auth-constant';
import { ActiveUserData } from '../../auth/interfaces/active-user-data.interface';

/** @nestjs/throttler v6 concatenates these with the named throttler key. */
const THROTTLER_SKIP = 'THROTTLER:SKIP';
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';

@Injectable()
export class CustomThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimits: RateLimitService,
    private readonly config: ConfigService,
    @Optional() private readonly jwtService?: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    if (this.config.get<boolean>('RATE_LIMIT_ENABLED', true) === false) {
      return true;
    }

    const handler = context.getHandler();
    const classRef = context.getClass();
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method = String(req.method || 'GET').toUpperCase();
    const isWrite = WRITE_METHODS.has(method);
    const tier: RateLimitTier = isWrite ? 'write' : 'read';

    if (this.isSkipped(handler, classRef, tier)) {
      return true;
    }

    const routeLimit = this.reflector.getAllAndOverride<number>(
      THROTTLER_LIMIT + tier,
      [handler, classRef],
    );
    const routeTtl = this.reflector.getAllAndOverride<number>(
      THROTTLER_TTL + tier,
      [handler, classRef],
    );

    const userId = this.extractUserId(req);
    const decision = await this.rateLimits.consume({
      tier,
      userId,
      ip: this.extractIp(req),
      limit: typeof routeLimit === 'number' ? routeLimit : undefined,
      windowMs: typeof routeTtl === 'number' ? routeTtl : undefined,
    });

    this.setRateLimitHeaders(res, decision.limit, decision.remaining, decision.resetAt);

    if (!decision.allowed) {
      const retryAfter = Math.max(1, decision.resetAt - Math.floor(Date.now() / 1000));
      res.setHeader?.(RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
      this.logger.warn(
        `Rate limited ${tier} ${decision.subject} key=${decision.key} adaptive=${decision.adaptive}`,
      );
      throw new ThrottlerException('Too Many Requests');
    }

    return true;
  }

  private isSkipped(
    handler: Function,
    classRef: Function,
    tier: RateLimitTier,
  ): boolean {
    const names = ['default', tier, 'read', 'write'];
    return names.some((name) => {
      const skip = this.reflector.getAllAndOverride<boolean>(THROTTLER_SKIP + name, [
        handler,
        classRef,
      ]);
      return skip === true;
    });
  }

  private extractUserId(req: {
    [key: string]: unknown;
    headers?: Record<string, string | string[] | undefined>;
  }): string | number | null {
    const attached = (req[REQUEST_USER_KEY] ?? req.user) as ActiveUserData | undefined;
    if (attached?.sub != null) {
      return attached.sub;
    }
    const header = req.headers?.authorization ?? req.headers?.Authorization;
    const value = Array.isArray(header) ? header[0] : header;
    if (!value || !this.jwtService || !value.startsWith('Bearer ')) {
      return null;
    }
    try {
      const payload = this.jwtService.verify<{ sub?: string | number }>(value.slice(7));
      return payload?.sub ?? null;
    } catch {
      return null;
    }
  }

  private extractIp(req: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  }): string {
    const forwarded = req.headers?.['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (forwardedValue) {
      return forwardedValue.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  private setRateLimitHeaders(
    res: {
      setHeader?: (name: string, value: string | number) => void;
      header?: (name: string, value: string | number) => void;
    },
    limit: number,
    remaining: number,
    resetAt: number,
  ) {
    const set = (name: string, value: string | number) => {
      res.setHeader?.(name, value);
      res.header?.(name, value);
    };
    set(RATE_LIMIT_HEADERS.LIMIT, limit);
    set(RATE_LIMIT_HEADERS.REMAINING, remaining);
    set(RATE_LIMIT_HEADERS.RESET, resetAt);
  }
}
