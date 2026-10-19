// @ts-nocheck
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { cookies as cookiesImport } from 'next/headers';
import { POST as postSessionRefresh } from '../../app/api/session/refresh/route';
import { createSession } from '../../lib/session';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

const cookies = vi.mocked(cookiesImport) as unknown as ReturnType<typeof vi.fn>;

describe('POST /api/session/refresh', () => {
  const testAddress = 'GDEMOXABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890XXXX';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_PASSWORD = 'test-password-at-least-32-characters-long';
    process.env.SESSION_MAX_AGE = '604800';
    delete process.env.SESSION_REFRESH_ENABLED;
  });

  it('should return 200 with address and expiresAt for a valid session', async () => {
    const { sealed } = await createSession(testAddress);

    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: sealed }),
      set: vi.fn(),
    });

    const response = await postSessionRefresh();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.address).toBe(testAddress);
    expect(data.data.expiresAt).toBeDefined();
    expect(typeof data.data.expiresAt).toBe('number');
  });

  it('should return 401 with Session expired message when no session cookie exists', async () => {
    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    });

    const response = await postSessionRefresh();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(data.message).toBe('Session expired');
  });

  it('should return 401 for an expired session', async () => {
    const now = Date.now();
    const { sealData } = require('iron-session');
    const expiredSession = {
      address: testAddress,
      createdAt: now - 8 * 24 * 60 * 60 * 1000,
      expiresAt: now - 24 * 60 * 60 * 1000,
    };

    const sealed = await sealData(expiredSession, {
      password: process.env.SESSION_PASSWORD!,
      ttl: 604800,
    });

    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: sealed }),
      set: vi.fn(),
    });

    const response = await postSessionRefresh();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(data.message).toBe('Session expired');

    const setCookieHeader = response.headers.get('Set-Cookie');
    expect(setCookieHeader).toContain('Max-Age=0');
  });

  it('should extend expiresAt when SESSION_REFRESH_ENABLED is true', async () => {
    process.env.SESSION_REFRESH_ENABLED = 'true';

    const { sealed } = await createSession(testAddress);

    const mockSet = vi.fn();
    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: sealed }),
      set: mockSet,
    });

    const response = await postSessionRefresh();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.address).toBe(testAddress);
    expect(data.data.expiresAt).toBeGreaterThan(Date.now());
    expect(mockSet).toHaveBeenCalled();
  });
});
