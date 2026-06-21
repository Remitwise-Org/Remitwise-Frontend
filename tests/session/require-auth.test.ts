/**
 * Unit tests for requireAuth helper function
 * Tests validation, error handling, and authenticated user data return
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { requireAuth, createSession, SessionData } from '../../lib/session';
import { sealData } from 'iron-session';

// Mock Next.js cookies
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookies)),
}));

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.SESSION_PASSWORD = 'test-password-at-least-32-characters-long';
  process.env.SESSION_MAX_AGE = '604800'; // 7 days
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('requireAuth', () => {
  const testAddress = 'GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const SESSION_PASSWORD = 'test-password-at-least-32-characters-long';

  it('should return authenticated user data for valid session', async () => {
    // Create a valid session
    const now = Date.now();
    const sessionData: SessionData = {
      address: testAddress,
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    };

    const sealed = await sealData(sessionData, {
      password: SESSION_PASSWORD,
      ttl: 604800,
    });

    mockCookies.get.mockReturnValue({ value: sealed });

    const result = await requireAuth();

    expect(result).toEqual({ address: testAddress });
    expect(mockCookies.get).toHaveBeenCalledWith('remitwise_session');
  });

  it('should throw 401 Response with "Not authenticated" when no session cookie exists', async () => {
    mockCookies.get.mockReturnValue(undefined);

    try {
      await requireAuth();
      expect.fail('Should have thrown Response');
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Not authenticated',
      });

      // Verify Set-Cookie header to clear cookie
      const setCookie = response.headers.get('Set-Cookie');
      expect(setCookie).toContain('remitwise_session=');
      expect(setCookie).toContain('Max-Age=0');
    }
  });

  it('should throw 401 Response with "Session expired" for expired session', async () => {
    // Create an expired session
    const now = Date.now();
    const sessionData: SessionData = {
      address: testAddress,
      createdAt: now - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      expiresAt: now - 24 * 60 * 60 * 1000, // 1 day ago (expired)
    };

    const sealed = await sealData(sessionData, {
      password: SESSION_PASSWORD,
      ttl: 604800,
    });

    mockCookies.get.mockReturnValue({ value: sealed });

    try {
      await requireAuth();
      expect.fail('Should have thrown Response');
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Session expired',
      });

      // Verify Set-Cookie header to clear expired cookie
      const setCookie = response.headers.get('Set-Cookie');
      expect(setCookie).toContain('remitwise_session=');
      expect(setCookie).toContain('Max-Age=0');
    }
  });

  it('should throw 401 Response with "Invalid session" for corrupted session cookie', async () => {
    // Provide an invalid encrypted value
    mockCookies.get.mockReturnValue({ value: 'corrupted-invalid-data' });

    try {
      await requireAuth();
      expect.fail('Should have thrown Response');
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Invalid session',
      });

      // Verify Set-Cookie header to clear invalid cookie
      const setCookie = response.headers.get('Set-Cookie');
      expect(setCookie).toContain('remitwise_session=');
      expect(setCookie).toContain('Max-Age=0');
    }
  });

  it('should throw 401 Response with "Invalid session" for session missing address', async () => {
    // Create session data without address
    const now = Date.now();
    const invalidSessionData = {
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    };

    const sealed = await sealData(invalidSessionData, {
      password: SESSION_PASSWORD,
      ttl: 604800,
    });

    mockCookies.get.mockReturnValue({ value: sealed });

    try {
      await requireAuth();
      expect.fail('Should have thrown Response');
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Invalid session',
      });
    }
  });

  it('should throw 401 Response with "Invalid session" for session missing expiresAt', async () => {
    // Create session data without expiresAt
    const now = Date.now();
    const invalidSessionData = {
      address: testAddress,
      createdAt: now,
    };

    const sealed = await sealData(invalidSessionData, {
      password: SESSION_PASSWORD,
      ttl: 604800,
    });

    mockCookies.get.mockReturnValue({ value: sealed });

    try {
      await requireAuth();
      expect.fail('Should have thrown Response');
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized',
        message: 'Invalid session',
      });
    }
  });

  it('should include Set-Cookie header to clear cookie on all error responses', async () => {
    const testCases = [
      { name: 'no cookie', mockValue: undefined },
      { name: 'corrupted cookie', mockValue: { value: 'invalid' } },
    ];

    for (const testCase of testCases) {
      mockCookies.get.mockReturnValue(testCase.mockValue);

      try {
        await requireAuth();
        expect.fail(`Should have thrown Response for ${testCase.name}`);
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const response = error as Response;
        
        const setCookie = response.headers.get('Set-Cookie');
        expect(setCookie).toBeTruthy();
        expect(setCookie).toContain('Max-Age=0');
      }
    }
  });

  it('should work correctly in protected route pattern', async () => {
    // Simulate a protected route handler
    const protectedRouteHandler = async () => {
      try {
        const { address } = await requireAuth();
        return Response.json({ data: 'protected data', user: address });
      } catch (res) {
        if (res instanceof Response) return res;
        throw res;
      }
    };

    // Test with valid session
    const now = Date.now();
    const sessionData: SessionData = {
      address: testAddress,
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    };

    const sealed = await sealData(sessionData, {
      password: SESSION_PASSWORD,
      ttl: 604800,
    });

    mockCookies.get.mockReturnValue({ value: sealed });

    const response = await protectedRouteHandler();
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toEqual({
      data: 'protected data',
      user: testAddress,
    });
  });

  it('should return 401 in protected route pattern when session is invalid', async () => {
    // Simulate a protected route handler
    const protectedRouteHandler = async () => {
      try {
        const { address } = await requireAuth();
        return Response.json({ data: 'protected data', user: address });
      } catch (res) {
        if (res instanceof Response) return res;
        throw res;
      }
    };

    // Test with no session
    mockCookies.get.mockReturnValue(undefined);

    const response = await protectedRouteHandler();
    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toBe('Not authenticated');
  });
});
