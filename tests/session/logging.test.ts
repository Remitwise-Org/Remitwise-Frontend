/**
 * Tests for session expiry and refresh logging
 * Validates Requirements 9.1, 9.2, 9.3, 9.4
 */

import { vi, type MockInstance, type Mock } from 'vitest';
import { cookies as cookiesImport } from 'next/headers';
import { getSession, getSessionWithRefresh } from '../../lib/session';
import { sealData } from 'iron-session';

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Loosely typed so tests can supply a partial cookie-store mock.
const cookies = vi.mocked(cookiesImport) as unknown as Mock;

describe('Session Logging', () => {
  const testAddress = 'GDEMOXABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890XXXX';
  let consoleInfoSpy: MockInstance;
  
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_PASSWORD = 'test-password-at-least-32-characters-long';
    process.env.SESSION_MAX_AGE = '604800'; // 7 days
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
  });

  describe('Session Expiry Logging', () => {
    it('should log session expiry with truncated wallet address', async () => {
      // Create expired session
      const now = Date.now();
      const expiredSession = {
        address: testAddress,
        createdAt: now - 8 * 24 * 60 * 60 * 1000, // 8 days ago
        expiresAt: now - 24 * 60 * 60 * 1000, // 1 day ago (expired)
      };
      
      const sealed = await sealData(expiredSession, {
        password: process.env.SESSION_PASSWORD!,
        ttl: 604800,
      });
      
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: sealed }),
        set: vi.fn(),
      });

      const session = await getSession();
      
      expect(session).toBeNull();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'session_expired',
          address: 'GDEMOX...XXXX', // Truncated address
          expiresAt: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it('should not include sensitive data in expiry logs', async () => {
      // Create expired session
      const now = Date.now();
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

      await getSession();
      
      const logCall = consoleInfoSpy.mock.calls[0][0];
      
      // Verify no sensitive data in logs
      expect(JSON.stringify(logCall)).not.toContain(sealed); // No encrypted cookie
      expect(JSON.stringify(logCall)).not.toContain(process.env.SESSION_PASSWORD!); // No password
      expect(logCall.address).not.toBe(testAddress); // Address is truncated
      expect(logCall.address).toBe('GDEMOX...XXXX');
    });

    it('should use structured logging format for expiry events', async () => {
      const now = Date.now();
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

      await getSession();
      
      const logCall = consoleInfoSpy.mock.calls[0][0];
      
      // Verify structured format
      expect(logCall).toHaveProperty('event');
      expect(logCall).toHaveProperty('address');
      expect(logCall).toHaveProperty('expiresAt');
      expect(logCall).toHaveProperty('timestamp');
      expect(logCall.event).toBe('session_expired');
    });
  });

  describe('Session Refresh Logging', () => {
    it('should log session refresh with truncated wallet address', async () => {
      process.env.SESSION_REFRESH_ENABLED = 'true';
      
      const now = Date.now();
      const validSession = {
        address: testAddress,
        createdAt: now - 60 * 60 * 1000, // 1 hour ago
        expiresAt: now + 6 * 24 * 60 * 60 * 1000, // 6 days from now
      };
      
      const sealed = await sealData(validSession, {
        password: process.env.SESSION_PASSWORD!,
        ttl: 604800,
      });
      
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: sealed }),
        set: vi.fn(),
      });

      const session = await getSessionWithRefresh();
      
      expect(session).not.toBeNull();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'session_refreshed',
          address: 'GDEMOX...XXXX', // Truncated address
          expiresAt: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it('should not include sensitive data in refresh logs', async () => {
      process.env.SESSION_REFRESH_ENABLED = 'true';
      
      const now = Date.now();
      const validSession = {
        address: testAddress,
        createdAt: now - 60 * 60 * 1000,
        expiresAt: now + 6 * 24 * 60 * 60 * 1000,
      };
      
      const sealed = await sealData(validSession, {
        password: process.env.SESSION_PASSWORD!,
        ttl: 604800,
      });
      
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: sealed }),
        set: vi.fn(),
      });

      await getSessionWithRefresh();
      
      const logCall = consoleInfoSpy.mock.calls[0][0];
      
      // Verify no sensitive data in logs
      expect(JSON.stringify(logCall)).not.toContain(sealed); // No encrypted cookie
      expect(JSON.stringify(logCall)).not.toContain(process.env.SESSION_PASSWORD!); // No password
      expect(logCall.address).not.toBe(testAddress); // Address is truncated
      expect(logCall.address).toBe('GDEMOX...XXXX');
    });

    it('should use structured logging format for refresh events', async () => {
      process.env.SESSION_REFRESH_ENABLED = 'true';
      
      const now = Date.now();
      const validSession = {
        address: testAddress,
        createdAt: now - 60 * 60 * 1000,
        expiresAt: now + 6 * 24 * 60 * 60 * 1000,
      };
      
      const sealed = await sealData(validSession, {
        password: process.env.SESSION_PASSWORD!,
        ttl: 604800,
      });
      
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: sealed }),
        set: vi.fn(),
      });

      await getSessionWithRefresh();
      
      const logCall = consoleInfoSpy.mock.calls[0][0];
      
      // Verify structured format
      expect(logCall).toHaveProperty('event');
      expect(logCall).toHaveProperty('address');
      expect(logCall).toHaveProperty('expiresAt');
      expect(logCall).toHaveProperty('timestamp');
      expect(logCall.event).toBe('session_refreshed');
    });

    it('should not log when refresh is disabled', async () => {
      delete process.env.SESSION_REFRESH_ENABLED;
      
      const now = Date.now();
      const validSession = {
        address: testAddress,
        createdAt: now - 60 * 60 * 1000,
        expiresAt: now + 6 * 24 * 60 * 60 * 1000,
      };
      
      const sealed = await sealData(validSession, {
        password: process.env.SESSION_PASSWORD!,
        ttl: 604800,
      });
      
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: sealed }),
        set: vi.fn(),
      });

      await getSessionWithRefresh();
      
      // No refresh log should be emitted when refresh is disabled
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('Address Truncation', () => {
    it('should truncate long addresses correctly', async () => {
      const now = Date.now();
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

      await getSession();
      
      const logCall = consoleInfoSpy.mock.calls[0][0];
      
      // Verify truncation format: first 6 chars + "..." + last 4 chars
      expect(logCall.address).toBe('GDEMOX...XXXX');
      expect(logCall.address.length).toBe(13); // 6 + 3 + 4
    });
  });
});
