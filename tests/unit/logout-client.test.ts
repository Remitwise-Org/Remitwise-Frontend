import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeRedirectPath, logout, getPostAuthRedirect } from '@/lib/client/logout';

// ---------------------------------------------------------------------------
// safeRedirectPath
// ---------------------------------------------------------------------------
describe('safeRedirectPath', () => {
  it('allows a simple relative path', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
  });

  it('allows a nested relative path', () => {
    expect(safeRedirectPath('/settings/profile')).toBe('/settings/profile');
  });

  it('allows the root path', () => {
    expect(safeRedirectPath('/')).toBe('/');
  });

  it('rejects an absolute https URL', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/');
  });

  it('rejects an absolute http URL', () => {
    expect(safeRedirectPath('http://evil.com/steal')).toBe('/');
  });

  it('rejects a protocol-relative URL', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/');
  });

  it('rejects a path that embeds :// after the leading slash', () => {
    expect(safeRedirectPath('/redirect?to=https://evil.com')).toBe('/');
  });

  it('rejects a path that does not start with /', () => {
    expect(safeRedirectPath('evil.com')).toBe('/');
  });

  it('returns / for an empty string', () => {
    expect(safeRedirectPath('')).toBe('/');
  });

  it('returns / for null', () => {
    expect(safeRedirectPath(null)).toBe('/');
  });

  it('returns / for undefined', () => {
    expect(safeRedirectPath(undefined)).toBe('/');
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------
const mockClearAuthState = vi.hoisted(() => vi.fn());

vi.mock('@/lib/client/sessionHandler', () => ({
  sessionHandler: {
    clearAuthState: mockClearAuthState,
  },
}));

describe('logout', () => {
  let locationHref = '';

  beforeEach(() => {
    mockClearAuthState.mockClear();
    locationHref = '';
    // Provide a minimal window global in the node environment
    vi.stubGlobal('window', {
      location: {
        get href() { return locationHref; },
        set href(v: string) { locationHref = v; },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('awaits the server response then clears auth state and redirects to /', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Logged out successfully' }),
    }));

    await logout();

    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
    expect(locationHref).toBe('/');
  });

  it('still clears state and redirects when API returns non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    await logout({ redirectTo: '/login' });

    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
    expect(locationHref).toBe('/login');
  });

  it('still clears state and redirects on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    await logout({ redirectTo: '/home' });

    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
    expect(locationHref).toBe('/home');
  });

  it('still clears state and redirects on timeout (AbortError)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      Object.assign(new Error('Aborted'), { name: 'AbortError' }),
    ));

    await logout();

    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
    expect(locationHref).toBe('/');
  });

  it('rejects an absolute URL redirect and falls back to /', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'ok' }),
    }));

    await logout({ redirectTo: 'https://evil.com' });

    expect(locationHref).toBe('/');
  });

  it('rejects a protocol-relative redirect and falls back to /', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'ok' }),
    }));

    await logout({ redirectTo: '//evil.com' });

    expect(locationHref).toBe('/');
  });

  it('clearAuthState is called exactly once regardless of fetch outcome', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

    await logout();

    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
  });

  it('uses / as default redirect when no options are provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'ok' }),
    }));

    await logout();

    expect(locationHref).toBe('/');
  });
});

// ---------------------------------------------------------------------------
// getPostAuthRedirect
// ---------------------------------------------------------------------------
describe('getPostAuthRedirect', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal('window', {
      location: { href: '' },
    });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when nothing is stored', () => {
    expect(getPostAuthRedirect()).toBeNull();
  });

  it('returns and removes a valid stored path', () => {
    store['redirect_after_auth'] = '/dashboard';
    const result = getPostAuthRedirect();
    expect(result).toBe('/dashboard');
    expect(store['redirect_after_auth']).toBeUndefined();
  });

  it('sanitizes a malicious stored path and returns /', () => {
    store['redirect_after_auth'] = 'https://phishing.example.com';
    const result = getPostAuthRedirect();
    expect(result).toBe('/');
    expect(store['redirect_after_auth']).toBeUndefined();
  });

  it('sanitizes a protocol-relative stored path and returns /', () => {
    store['redirect_after_auth'] = '//evil.com';
    const result = getPostAuthRedirect();
    expect(result).toBe('/');
  });

  it('removes the stored value even when the path was invalid', () => {
    store['redirect_after_auth'] = 'http://bad.example.com';
    getPostAuthRedirect();
    expect(store['redirect_after_auth']).toBeUndefined();
  });

  it('returns null a second time after the first call consumed the value', () => {
    store['redirect_after_auth'] = '/settings';
    getPostAuthRedirect();
    expect(getPostAuthRedirect()).toBeNull();
  });
});
