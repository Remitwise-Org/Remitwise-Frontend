import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NetworkStatusProvider, useNetworkStatus } from '@/lib/context/NetworkStatusContext';

describe('NetworkStatusContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to online when browser reports online', () => {
    vi.stubGlobal('navigator', { onLine: true });

    const { result } = renderHook(() => useNetworkStatus(), {
      wrapper: ({ children }) => <NetworkStatusProvider>{children}</NetworkStatusProvider>,
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('defaults to offline when browser reports offline', () => {
    vi.stubGlobal('navigator', { onLine: false });

    const { result } = renderHook(() => useNetworkStatus(), {
      wrapper: ({ children }) => <NetworkStatusProvider>{children}</NetworkStatusProvider>,
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('updates to false when an offline event is dispatched', () => {
    vi.stubGlobal('navigator', { onLine: true });

    const { result } = renderHook(() => useNetworkStatus(), {
      wrapper: ({ children }) => <NetworkStatusProvider>{children}</NetworkStatusProvider>,
    });

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('updates to true when an online event is dispatched after going offline', () => {
    vi.stubGlobal('navigator', { onLine: true });

    const { result } = renderHook(() => useNetworkStatus(), {
      wrapper: ({ children }) => <NetworkStatusProvider>{children}</NetworkStatusProvider>,
    });

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('removes event listeners on unmount', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus(), {
      wrapper: ({ children }) => <NetworkStatusProvider>{children}</NetworkStatusProvider>,
    });

    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('throws an error if useNetworkStatus is called outside NetworkStatusProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useNetworkStatus())).toThrowError(
      'useNetworkStatus must be used within a NetworkStatusProvider'
    );

    consoleSpy.mockRestore();
  });
});
