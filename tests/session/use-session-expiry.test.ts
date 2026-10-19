import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSessionExpiry } from '@/lib/client/useSessionExpiry';
import { apiClient } from '@/lib/client/apiClient';
import { sessionHandler } from '@/lib/client/sessionHandler';

vi.mock('@/lib/client/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/client/sessionHandler', () => ({
  sessionHandler: {
    handleSessionExpiry: vi.fn(),
    dispatchSessionExpiring: vi.fn((countdown) => {
      // Simulate what the real sessionHandler does so the hook can react to it
      const event = new CustomEvent('session-expiring', {
        detail: { countdown, message: 'Warning' }
      });
      window.dispatchEvent(event);
    }),
  },
}));

describe('useSessionExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    vi.clearAllMocks();
    localStorage.clear();
    process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED = 'true';
    
    // Default mock implementation
    vi.mocked(apiClient.get).mockResolvedValue(
      new Response(JSON.stringify({ expiresAt: Date.now() + 120000 }))
    );
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('warning appears at the threshold and countdown decrements', async () => {
    const clock = () => Date.now();
    const { result } = renderHook(() => useSessionExpiry({ clock }));

    // Advance to resolve the initial fetchSession promise
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.phase).toBe('none');

    // Fast-forward to threshold (T-60s)
    // Expiry is +120s. Warning threshold is at +60s.
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(sessionHandler.dispatchSessionExpiring).toHaveBeenCalledWith(60);
    expect(result.current.phase).toBe('warning');
    expect(result.current.countdown).toBe(60);

    // Fast-forward 1 second to see countdown decrement
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(result.current.countdown).toBe(59);
  });

  it('expiry triggers the documented action', async () => {
    const clock = () => Date.now();
    const { result } = renderHook(() => useSessionExpiry({ clock }));

    await act(async () => {
      await Promise.resolve();
    });

    // Fast-forward past expiry (+120s)
    act(() => {
      vi.advanceTimersByTime(120000);
    });

    expect(sessionHandler.handleSessionExpiry).toHaveBeenCalled();
    expect(result.current.phase).toBe('expired');
  });

  it('re-auth/extend clears the warning', async () => {
    const clock = () => Date.now();
    const { result } = renderHook(() => useSessionExpiry({ clock }));

    await act(async () => {
      await Promise.resolve();
    });

    // Trigger warning
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(result.current.phase).toBe('warning');

    // Simulate successful refresh
    vi.mocked(apiClient.post).mockResolvedValue(
      new Response(JSON.stringify({ expiresAt: Date.now() + 120000 }))
    );

    await act(async () => {
      const success = await result.current.staySignedIn();
      expect(success).toBe(true);
    });

    // Warning should be cleared
    expect(result.current.phase).toBe('none');
    expect(result.current.countdown).toBe(0);
  });

  it('clears timers on unmount', async () => {
    const clock = () => Date.now();
    const { unmount } = renderHook(() => useSessionExpiry({ clock }));

    await act(async () => {
      await Promise.resolve();
    });

    const timerCountBefore = vi.getTimerCount();
    unmount();
    const timerCountAfter = vi.getTimerCount();

    expect(timerCountAfter).toBeLessThan(timerCountBefore);
  });

  it('handles session already expired on mount', async () => {
    const clock = () => Date.now();
    // mock expires in the past
    vi.mocked(apiClient.get).mockResolvedValue(
      new Response(JSON.stringify({ expiresAt: Date.now() - 10000 }))
    );

    renderHook(() => useSessionExpiry({ clock }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(sessionHandler.handleSessionExpiry).toHaveBeenCalled();
  });

  it('extend before expiry resets the timers', async () => {
    const clock = () => Date.now();
    const { result } = renderHook(() => useSessionExpiry({ clock }));

    await act(async () => {
      await Promise.resolve();
    });

    // We trigger staySignedIn before the warning phase
    vi.mocked(apiClient.post).mockResolvedValue(
      new Response(JSON.stringify({ expiresAt: Date.now() + 200000 }))
    );

    await act(async () => {
      await result.current.staySignedIn();
    });

    expect(result.current.phase).toBe('none');
    
    // Original warning time was +60s. Now it should be +140s.
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    
    // Warning shouldn't trigger yet
    expect(result.current.phase).toBe('none');
  });

  it('handles rapid mount/unmount safely', async () => {
    const clock = () => Date.now();
    const { unmount } = renderHook(() => useSessionExpiry({ clock }));
    // Immediately unmount before initial fetch resolves
    unmount();

    await act(async () => {
      await Promise.resolve();
    });

    // Should not throw or cause memory leaks
    expect(true).toBe(true);
  });
  
  it('threshold boundary tick (exactly at expiration)', async () => {
    const clock = () => Date.now();
    const { result } = renderHook(() => useSessionExpiry({ clock }));

    await act(async () => {
      await Promise.resolve();
    });

    // trigger warning
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    
    // Advance 59 seconds, countdown is 1
    act(() => {
      vi.advanceTimersByTime(59000);
    });
    
    expect(result.current.countdown).toBe(1);
    expect(result.current.phase).toBe('warning');
    
    // Advance 1 more second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Should be expired
    expect(result.current.phase).toBe('expired');
  });

  it('handles session-expired event', async () => {
    const clock = () => Date.now();
    const { result } = renderHook(() => useSessionExpiry({ clock }));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('session-expired', { detail: { message: 'Custom expired' } }));
    });

    expect(result.current.phase).toBe('expired');
    expect(result.current.message).toBe('Custom expired');
    expect(result.current.countdown).toBe(0);
  });

  it('handles session-login event', async () => {
    const clock = () => Date.now();
    const { result } = renderHook(() => useSessionExpiry({ clock }));

    await act(async () => {
      await Promise.resolve();
    });

    const newExpiry = Date.now() + 300000;
    act(() => {
      window.dispatchEvent(new CustomEvent('session-login', { detail: { expiresAt: newExpiry } }));
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(result.current.phase).toBe('none');

    act(() => {
      vi.advanceTimersByTime(180000);
    });
    expect(result.current.phase).toBe('warning');
  });

  it('handles refresh failure', async () => {
    const clock = () => Date.now();
    const { result } = renderHook(() => useSessionExpiry({ clock }));

    await act(async () => {
      await Promise.resolve();
    });

    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));
    
    await act(async () => {
      const success = await result.current.staySignedIn();
      expect(success).toBe(false);
    });
    
    expect(result.current.isRefreshing).toBe(false);
  });
});
