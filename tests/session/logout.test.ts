/**
 * Tests for logout endpoint
 * Validates Requirements 5.1, 5.2, 5.3
 */

import { POST as postLogout } from '../../app/api/auth/logout/route';

describe('Logout Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SESSION_PASSWORD = 'test-password-at-least-32-characters-long';
    process.env.SESSION_MAX_AGE = '604800'; // 7 days
  });

  it('should return 200 with success message', async () => {
    const response = await postLogout(new Request('http://localhost/api/auth/logout', { method: 'POST' }) as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.message).toBe('Logged out successfully');
  });

  it('should include Set-Cookie header to clear session', async () => {
    const response = await postLogout(new Request('http://localhost/api/auth/logout', { method: 'POST' }) as any);
    const setCookieHeader = response.headers.get('Set-Cookie');

    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain('remitwise_session=');
    expect(setCookieHeader).toContain('Max-Age=0');
    expect(setCookieHeader).toContain('Path=/');
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('SameSite=Lax');
  });

  it('should work without existing session', async () => {
    // Logout should succeed even if no session exists
    const response = await postLogout(new Request('http://localhost/api/auth/logout', { method: 'POST' }) as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.message).toBe('Logged out successfully');
  });

  it('should use centralized clearSessionCookie function', async () => {
    // Verify that the logout endpoint uses the centralized function
    // by checking the cookie format matches the expected pattern
    const response = await postLogout(new Request('http://localhost/api/auth/logout', { method: 'POST' }) as any);
    const setCookieHeader = response.headers.get('Set-Cookie');

    // The clearSessionCookie function should produce a consistent format
    expect(setCookieHeader).toMatch(/remitwise_session=; Path=\/; HttpOnly; SameSite=Lax; Max-Age=0/);
  });
});
