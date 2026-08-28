import { renderHook, act } from '@testing-library/react';
import { useFocusSession } from '../useFocusSession';
import { FocusProvider } from '@/context/FocusContext';
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FocusProvider>{children}</FocusProvider>
);

describe('useFocusSession', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts a session and updates timer', () => {
    const { result } = renderHook(() => useFocusSession(), { wrapper });

    expect(result.current.isActive).toBe(false);
    expect(result.current.timeLeft).toBe(0);

    act(() => {
      result.current.startSession(25);
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.timeLeft).toBe(25 * 60);

    // Fast-forward 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.timeLeft).toBe(25 * 60 - 10);
  });

  it('resumes a session after reload/remount', () => {
    const now = Date.now();
    const activeSession = {
      startTime: now - 30000, // 30 seconds ago
      durationMinutes: 10,
    };
    localStorage.setItem('focus_active_session', JSON.stringify(activeSession));

    const { result } = renderHook(() => useFocusSession(), { wrapper });

    // 10 minutes (600s) - 30s elapsed = 570s left
    expect(result.current.isActive).toBe(true);
    expect(result.current.timeLeft).toBeGreaterThanOrEqual(568);
    expect(result.current.timeLeft).toBeLessThanOrEqual(570);
  });

  it('cancels an active session', () => {
    const { result } = renderHook(() => useFocusSession(), { wrapper });

    act(() => {
      result.current.startSession(10);
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.cancelSession();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.timeLeft).toBe(0);
    expect(localStorage.getItem('focus_active_session')).toBeNull();
  });

  it('completes the session when countdown reaches zero', async () => {
    const { result } = renderHook(() => useFocusSession(), { wrapper });

    act(() => {
      result.current.startSession(10);
    });

    expect(result.current.isActive).toBe(true);

    // Advance timers by 10 minutes (600 seconds)
    await act(async () => {
      vi.advanceTimersByTime(600 * 1000);
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.timeLeft).toBe(0);
    expect(localStorage.getItem('focus_active_session')).toBeNull();
    // XP should have been added (base 10 XP for 10 min session)
    expect(localStorage.getItem('focus_xp')).toBe('10');
  });

  it('queues session in offline queue when navigator is offline', async () => {
    // Stub navigator.onLine to return false
    vi.stubGlobal('navigator', { onLine: false });

    const { result } = renderHook(() => useFocusSession(), { wrapper });

    act(() => {
      result.current.startSession(10);
    });

    // Complete session countdown
    act(() => {
      vi.advanceTimersByTime(600 * 1000);
    });

    // Advance mock record session timeout (1200ms)
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // Check that transaction is queued in localStorage
    const queue = localStorage.getItem('focus_offline_queue');
    expect(queue).toBeDefined();
    expect(JSON.parse(queue!).length).toBe(1);
    expect(JSON.parse(queue!)[0].durationMinutes).toBe(10);
  });
});
