import { ConfigService } from '@nestjs/config';
import { RateLimitService } from './rate-limit.service';
import { MemoryRateLimitStore } from './rate-limit.store';

function config(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_READ_LIMIT: 100,
    RATE_LIMIT_WRITE_LIMIT: 20,
    RATE_LIMIT_AUTH_MULTIPLIER: 3,
    RATE_LIMIT_ABUSE_THRESHOLD: 5,
    RATE_LIMIT_ABUSE_WINDOW_MS: 60_000,
    RATE_LIMIT_ABUSE_FACTOR: 0.5,
    ...overrides,
  };
  return {
    get: (key: string, fallback?: unknown) =>
      values[key] !== undefined ? values[key] : fallback,
  } as ConfigService;
}

describe('RateLimitService', () => {
  it('uses per-IP keys for anonymous callers and per-user keys when authenticated', () => {
    const service = new RateLimitService(config(), null);
    expect(service.resolveSubject(null, '10.0.0.1')).toEqual({
      subject: 'ip',
      id: 'ip:10.0.0.1',
    });
    expect(service.resolveSubject(42, '10.0.0.1')).toEqual({
      subject: 'user',
      id: 'user:42',
    });
  });

  it('enforces the write tier (20/min) under concurrent load for one IP', async () => {
    const service = new RateLimitService(config(), null);
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        service.consume({ tier: 'write', ip: '203.0.113.10' }),
      ),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(20);
    expect(results.filter((r) => !r.allowed)).toHaveLength(30);
    const lastAllowed = results.filter((r) => r.allowed).at(-1);
    expect(lastAllowed?.remaining).toBe(0);
    expect(lastAllowed?.limit).toBe(20);
  });

  it('gives authenticated users a higher read quota than the same IP', async () => {
    const service = new RateLimitService(config(), null);
    const anon = await Promise.all(
      Array.from({ length: 101 }, () =>
        service.consume({ tier: 'read', ip: '198.51.100.2' }),
      ),
    );
    const authed = await Promise.all(
      Array.from({ length: 101 }, () =>
        service.consume({ tier: 'read', userId: 7, ip: '198.51.100.2' }),
      ),
    );
    expect(anon.filter((r) => r.allowed)).toHaveLength(100);
    expect(authed.filter((r) => r.allowed)).toHaveLength(101);
    expect(authed[0].limit).toBe(300);
    expect(anon[0].subject).toBe('ip');
    expect(authed[0].subject).toBe('user');
  });

  it('tightens quotas after repeated denials (adaptive abuse window)', async () => {
    const service = new RateLimitService(
      config({
        RATE_LIMIT_WRITE_LIMIT: 3,
        RATE_LIMIT_READ_LIMIT: 10,
        RATE_LIMIT_ABUSE_THRESHOLD: 2,
        RATE_LIMIT_ABUSE_FACTOR: 0.5,
      }),
      null,
    );

    for (let i = 0; i < 3; i++) {
      await service.consume({ tier: 'write', ip: '192.0.2.9' });
    }
    await service.consume({ tier: 'write', ip: '192.0.2.9' });
    await service.consume({ tier: 'write', ip: '192.0.2.9' });

    const read = await service.consume({ tier: 'read', ip: '192.0.2.9' });
    expect(read.adaptive).toBe(true);
    expect(read.limit).toBe(5);
  });

  it('records sliding-window hits atomically on the memory store', async () => {
    const store = new MemoryRateLimitStore();
    const now = Date.now();
    const hits = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        store.hit('k', now, 60_000, 10, `m-${i}`),
      ),
    );
    expect(hits.filter((h) => h.allowed)).toHaveLength(10);
    expect(hits.filter((h) => !h.allowed)).toHaveLength(30);
  });
});
