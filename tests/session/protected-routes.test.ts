/**
 * Tests for example protected routes demonstrating auth middleware patterns
 */

import { vi, type Mock } from 'vitest';
import { cookies as cookiesImport } from 'next/headers';
import { GET as getExampleRefresh } from '../../app/api/protected/example-refresh/route';
import { GET as getExampleRequireAuth } from '../../app/api/protected/example-require-auth/route';
import { createSession, getSessionCookieHeader } from '../../lib/session';

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Loosely typed so tests can supply a partial cookie-store mock.
const cookies = vi.mocked(cookiesImport) as unknown as Mock;

describe('Protected Routes - Example Implementations', () => {
  const testAddress = 'GDEMOXABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890XXXX';
  
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_PASSWORD = 'test-password-at-least-32-characters-long';
    process.env.SESSION_MAX_AGE = '604800'; // 7 days
    delete process.env.SESSION_REFRESH_ENABLED;
  });

  describe('Example Route: getSessionWithRefresh pattern', () => {
    it('should return protected data for valid session', async () => {
      const sealed = await createSession(testAddress);
      
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: sealed }),
        set: vi.fn(),
      });

      const response = await getExampleRefresh();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Protected data accessed successfully');
      expect(data.user).toBe(testAddress);
      expect(data.sessionInfo).toBeDefined();
      expect(data.sessionInfo.createdAt).toBeDefined();
      expect(data.sessionInfo.expiresAt).toBeDefined();
    });

    it('should return 401 for expired session', async () => {
      // Create session with past expiry
      const now = Date.now();
      const expiredSession = {
        address: testAddress,
        createdAt: now - 8 * 24 * 60 * 60 * 1000, // 8 days ago
        expiresAt: now - 24 * 60 * 60 * 1000, // 1 day ago (expired)
      };
      
      const { sealData } = require('iron-session');
      const sealed = await sealData(expiredSession, {
        password: process.env.SESSION_PASSWORD!,
        ttl: 604800,
      });
      
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: sealed }),
        set: vi.fn(),
      });

      const response = await getExampleRefresh();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Session expired');
      
      // Verify Set-Cookie header to clear expired cookie
      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('Max-Age=0');
    });

    it('should return 401 for missing session', async () => {
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
      });

      const response = await getExampleRefresh();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Session expired');
    });
  });

  describe('Example Route: requireAuth pattern', () => {
    it('should return protected data for valid session', async () => {
      const sealed = await createSession(testAddress);
      
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: sealed }),
        set: vi.fn(),
      });

      const response = await getExampleRequireAuth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Protected data accessed successfully');
      expect(data.user).toBe(testAddress);
      expect(data.data).toBeDefined();
      expect(data.data.accountBalance).toBe(1000);
    });

    it('should return 401 for expired session', async () => {
      // Create session with past expiry
      const now = Date.now();
      const expiredSession = {
        address: testAddress,
        createdAt: now - 8 * 24 * 60 * 60 * 1000, // 8 days ago
        expiresAt: now - 24 * 60 * 60 * 1000, // 1 day ago (expired)
      };
      
      const { sealData } = require('iron-session');
      const sealed = await sealData(expiredSession, {
        password: process.env.SESSION_PASSWORD!,
        ttl: 604800,
      });
      
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: sealed }),
        set: vi.fn(),
      });

      const response = await getExampleRequireAuth();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Session expired');
    });

    it('should return 401 for missing session', async () => {
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
      });

      const response = await getExampleRequireAuth();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Not authenticated');
    });
  });
});
