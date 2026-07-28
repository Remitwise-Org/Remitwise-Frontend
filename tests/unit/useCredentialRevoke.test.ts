import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCredentialRevoke } from '@/lib/client/useCredentialRevoke';

const mockClearAuthState = vi.hoisted(() => vi.fn());

vi.mock('@/lib/client/sessionHandler', () => ({
  sessionHandler: {
    clearAuthState: mockClearAuthState,
  },
}));

describe('useCredentialRevoke', () => {
  let locationHref = '';

  beforeEach(() => {
    mockClearAuthState.mockClear();
    locationHref = '';
    // Redefine only `window.location` on the real jsdom window so React's
    // renderer keeps working; replacing the whole `window` global (as
    // logout-client.test.ts does for the non-hook `logout()` helper) breaks
    // React's scheduler here.
    Object.defineProperty(window, 'location', {
      value: {
        get href() { return locationHref; },
        set href(v: string) { locationHref = v; },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts idle with no error', () => {
    const { result } = renderHook(() => useCredentialRevoke());

    expect(result.current.isRevoking).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls the logout endpoint, clears auth state, and redirects to / on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Logged out successfully' }),
    }));

    const { result } = renderHook(() => useCredentialRevoke());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.revoke();
    });

    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));
    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
    expect(success).toBe(true);
    expect(locationHref).toBe('/');
    expect(result.current.isRevoking).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('redirects to a custom safe path on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'ok' }),
    }));

    const { result } = renderHook(() => useCredentialRevoke());

    await act(async () => {
      await result.current.revoke({ redirectTo: '/settings/security' });
    });

    expect(locationHref).toBe('/settings/security');
  });

  it('sanitizes an unsafe redirect target and falls back to /', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'ok' }),
    }));

    const { result } = renderHook(() => useCredentialRevoke());

    await act(async () => {
      await result.current.revoke({ redirectTo: 'https://evil.com' });
    });

    expect(locationHref).toBe('/');
  });

  it('clears auth state and reports an error on a non-OK response, without redirecting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { result } = renderHook(() => useCredentialRevoke());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.revoke();
    });

    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
    expect(success).toBe(false);
    expect(locationHref).toBe('');
    expect(result.current.error).toBe('Revoke request failed with status 500');
    expect(result.current.isRevoking).toBe(false);
  });

  it('clears auth state and reports an error on a network failure, without redirecting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const { result } = renderHook(() => useCredentialRevoke());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.revoke();
    });

    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
    expect(success).toBe(false);
    expect(locationHref).toBe('');
    expect(result.current.error).toBe('Network failure');
  });

  it('reports a timeout error on AbortError, without redirecting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      Object.assign(new Error('Aborted'), { name: 'AbortError' }),
    ));

    const { result } = renderHook(() => useCredentialRevoke());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.revoke();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Revoke request timed out after 5000ms');
    expect(locationHref).toBe('');
  });

  it('clears any previous error at the start of a new revoke attempt', async () => {
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'ok' }) }));

    const { result } = renderHook(() => useCredentialRevoke());

    await act(async () => {
      await result.current.revoke();
    });
    expect(result.current.error).toBe('Revoke request failed with status 500');

    await act(async () => {
      await result.current.revoke();
    });
    expect(result.current.error).toBeNull();
    expect(locationHref).toBe('/');
  });
});
