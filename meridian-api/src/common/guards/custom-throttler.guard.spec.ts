import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './custom-throttler.guard';
import { RateLimitService } from '../../rate-limit/rate-limit.service';
import { RATE_LIMIT_HEADERS } from '../../rate-limit/rate-limit.constants';

function config(enabled = true): ConfigService {
  return {
    get: (key: string, fallback?: unknown) =>
      key === 'RATE_LIMIT_ENABLED' ? enabled : fallback,
  } as ConfigService;
}

function httpContext(params: {
  method?: string;
  ip?: string;
  user?: { sub: number };
  headers?: Record<string, string>;
  handler?: Function;
  classRef?: Function;
}) {
  const setHeader = jest.fn();
  const request = {
    method: params.method ?? 'GET',
    ip: params.ip ?? '127.0.0.1',
    headers: params.headers ?? {},
    user: params.user,
  };
  const context = {
    getType: () => 'http',
    getHandler: () => params.handler ?? function handler() {},
    getClass: () => params.classRef ?? class Ctrl {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader, header: setHeader }),
    }),
  } as unknown as ExecutionContext;
  return { context, setHeader, request };
}

describe('CustomThrottlerGuard', () => {
  const reflector = new Reflector();

  it('sets X-RateLimit-* headers on allowed requests', async () => {
    const rateLimits = {
      consume: jest.fn().mockResolvedValue({
        allowed: true,
        count: 1,
        limit: 100,
        remaining: 99,
        resetAt: 1_700_000_000,
        tier: 'read',
        key: 'rl:read:ip:127.0.0.1',
        subject: 'ip',
        adaptive: false,
      }),
    } as unknown as RateLimitService;
    const guard = new CustomThrottlerGuard(reflector, rateLimits, config());
    const { context, setHeader } = httpContext({ method: 'GET' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(setHeader).toHaveBeenCalledWith(RATE_LIMIT_HEADERS.LIMIT, 100);
    expect(setHeader).toHaveBeenCalledWith(RATE_LIMIT_HEADERS.REMAINING, 99);
    expect(setHeader).toHaveBeenCalledWith(RATE_LIMIT_HEADERS.RESET, 1_700_000_000);
  });

  it('throws 429 and sets Retry-After when the quota is exhausted', async () => {
    const rateLimits = {
      consume: jest.fn().mockResolvedValue({
        allowed: false,
        count: 20,
        limit: 20,
        remaining: 0,
        resetAt: Math.floor(Date.now() / 1000) + 30,
        tier: 'write',
        key: 'rl:write:ip:10.0.0.1',
        subject: 'ip',
        adaptive: false,
      }),
    } as unknown as RateLimitService;
    const guard = new CustomThrottlerGuard(reflector, rateLimits, config());
    const { context, setHeader } = httpContext({
      method: 'POST',
      ip: '10.0.0.1',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ThrottlerException,
    );
    expect(setHeader).toHaveBeenCalledWith(RATE_LIMIT_HEADERS.LIMIT, 20);
    expect(setHeader).toHaveBeenCalledWith(
      RATE_LIMIT_HEADERS.RETRY_AFTER,
      expect.any(Number),
    );
  });

  it('handles concurrent requests against the real service without double-counting', async () => {
    const service = new RateLimitService(
      {
        get: (key: string, fallback?: unknown) => {
          const values: Record<string, unknown> = {
            RATE_LIMIT_WRITE_LIMIT: 20,
            RATE_LIMIT_WINDOW_MS: 60_000,
            RATE_LIMIT_AUTH_MULTIPLIER: 3,
            RATE_LIMIT_ABUSE_THRESHOLD: 50,
            RATE_LIMIT_ABUSE_WINDOW_MS: 60_000,
            RATE_LIMIT_ABUSE_FACTOR: 0.5,
          };
          return values[key] ?? fallback;
        },
      } as ConfigService,
      null,
    );
    const guard = new CustomThrottlerGuard(reflector, service, config());

    const outcomes = await Promise.allSettled(
      Array.from({ length: 40 }, () => {
        const { context } = httpContext({ method: 'POST', ip: '198.51.100.9' });
        return guard.canActivate(context);
      }),
    );

    const allowed = outcomes.filter((o) => o.status === 'fulfilled').length;
    const blocked = outcomes.filter(
      (o) =>
        o.status === 'rejected' && o.reason instanceof ThrottlerException,
    ).length;
    expect(allowed).toBe(20);
    expect(blocked).toBe(20);
  });

  it('is a no-op when RATE_LIMIT_ENABLED is false', async () => {
    const rateLimits = { consume: jest.fn() } as unknown as RateLimitService;
    const guard = new CustomThrottlerGuard(reflector, rateLimits, config(false));
    const { context } = httpContext({ method: 'POST' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(rateLimits.consume).not.toHaveBeenCalled();
  });
});
