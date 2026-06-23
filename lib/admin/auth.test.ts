import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAdminAuthorized, getAdminIdentity } from '@/lib/admin/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// Mock NextRequest and cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

function createMockRequest({
  headers = {},
  cookieValues = {},
}: {
  headers?: Record<string, string>;
  cookieValues?: Record<string, string>;
}): NextRequest {
  const requestHeaders = new Headers(headers);
  const requestCookies = {
    get: (name: string) => {
      if (cookieValues[name]) {
        return { name, value: cookieValues[name] };
      }
      return undefined;
    },
  };

  // The actual NextRequest constructor is not easily mockable,
  // so we create an object that has the properties our functions use.
  return {
    headers: requestHeaders,
    cookies: requestCookies,
  } as unknown as NextRequest;
}

describe('lib/admin/auth', () => {
  const TEST_SECRET = 'a-very-secure-and-long-admin-secret-key';

  beforeEach(() => {
    // Ensure env is clean before each test
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isAdminAuthorized', () => {
    it('should return false if ADMIN_SECRET is not set', () => {
      const request = createMockRequest({ headers: { 'x-admin-key': TEST_SECRET } });
      expect(isAdminAuthorized(request)).toBe(false);
    });

    it('should return false if ADMIN_SECRET is an empty string', () => {
      vi.stubEnv('ADMIN_SECRET', '');
      const request = createMockRequest({ headers: { 'x-admin-key': TEST_SECRET } });
      expect(isAdminAuthorized(request)).toBe(false);
    });

    it('should return false if ADMIN_SECRET is only whitespace', () => {
      vi.stubEnv('ADMIN_SECRET', '   ');
      const request = createMockRequest({ headers: { 'x-admin-key': TEST_SECRET } });
      expect(isAdminAuthorized(request)).toBe(false);
    });

    it('should return false if no key is provided', () => {
      vi.stubEnv('ADMIN_SECRET', TEST_SECRET);
      const request = createMockRequest({});
      expect(isAdminAuthorized(request)).toBe(false);
    });

    it('should return true for a valid x-admin-key header', () => {
      vi.stubEnv('ADMIN_SECRET', TEST_SECRET);
      const request = createMockRequest({ headers: { 'x-admin-key': TEST_SECRET } });
      expect(isAdminAuthorized(request)).toBe(true);
    });

    it('should return true for a valid admin_key cookie', () => {
      vi.stubEnv('ADMIN_SECRET', TEST_SECRET);
      const request = createMockRequest({ cookieValues: { admin_key: TEST_SECRET } });
      expect(isAdminAuthorized(request)).toBe(true);
    });

    it('should return true for a valid admin_secret cookie', () => {
      vi.stubEnv('ADMIN_SECRET', TEST_SECRET);
      const request = createMockRequest({ cookieValues: { admin_secret: TEST_SECRET } });
      expect(isAdminAuthorized(request)).toBe(true);
    });

    it('should return false for an incorrect header key', () => {
      vi.stubEnv('ADMIN_SECRET', TEST_SECRET);
      const request = createMockRequest({ headers: { 'x-admin-key': 'wrong-secret' } });
      expect(isAdminAuthorized(request)).toBe(false);
    });

    it('should return false for an incorrect cookie key', () => {
      vi.stubEnv('ADMIN_SECRET', TEST_SECRET);
      const request = createMockRequest({ cookieValues: { admin_key: 'wrong-secret' } });
      expect(isAdminAuthorized(request)).toBe(false);
    });

    it('should return false for a key with a different length (timingSafeEqual check)', () => {
      vi.stubEnv('ADMIN_SECRET', TEST_SECRET);
      const request = createMockRequest({ headers: { 'x-admin-key': 'short' } });
      expect(isAdminAuthorized(request)).toBe(false);
    });

    it('should handle whitespace in provided keys', () => {
      vi.stubEnv('ADMIN_SECRET', TEST_SECRET);
      const requestWithHeader = createMockRequest({ headers: { 'x-admin-key': `  ${TEST_SECRET}  ` } });
      const requestWithCookie = createMockRequest({ cookieValues: { admin_key: `  ${TEST_SECRET}  ` } });

      expect(isAdminAuthorized(requestWithHeader)).toBe(true);
      expect(isAdminAuthorized(requestWithCookie)).toBe(true);
    });

    it('should prioritize header over cookie', () => {
      vi.stubEnv('ADMIN_SECRET', TEST_SECRET);
      const request = createMockRequest({
        headers: { 'x-admin-key': TEST_SECRET },
        cookieValues: { admin_key: 'wrong-secret' },
      });
      expect(isAdminAuthorized(request)).toBe(true);
    });
  });

  describe('getAdminIdentity', () => {
    it('should return "header:x-admin-key" when authorized by header', () => {
      const request = createMockRequest({ headers: { 'x-admin-key': 'any-value' } });
      expect(getAdminIdentity(request)).toBe('header:x-admin-key');
    });

    it('should return "cookie:admin_key" when authorized by admin_key cookie', () => {
      const request = createMockRequest({ cookieValues: { admin_key: 'any-value' } });
      expect(getAdminIdentity(request)).toBe('cookie:admin_key');
    });

    it('should return "cookie:admin_secret" when authorized by admin_secret cookie', () => {
      const request = createMockRequest({ cookieValues: { admin_secret: 'any-value' } });
      expect(getAdminIdentity(request)).toBe('cookie:admin_secret');
    });

    it('should prioritize header identity over cookie identity', () => {
      const request = createMockRequest({
        headers: { 'x-admin-key': 'any-value' },
        cookieValues: { admin_key: 'another-value' },
      });
      expect(getAdminIdentity(request)).toBe('header:x-admin-key');
    });

    it('should prioritize admin_key cookie over admin_secret cookie', () => {
        const request = createMockRequest({
          cookieValues: { admin_key: 'value1', admin_secret: 'value2' },
        });
        expect(getAdminIdentity(request)).toBe('cookie:admin_key');
      });

    it('should return "unknown" if no key is provided', () => {
      const request = createMockRequest({});
      expect(getAdminIdentity(request)).toBe('unknown');
    });
  });
});