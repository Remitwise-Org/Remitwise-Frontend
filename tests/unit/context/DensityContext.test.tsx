import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { DensityProvider, useDensity } from '@/lib/context/DensityContext';

describe('DensityContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('provides default "comfortable" density when no value is persisted', () => {
    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });

    expect(result.current.density).toBe('comfortable');
  });

  it('restores a previously persisted value on mount', () => {
    localStorage.setItem('display-density', 'compact');

    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });

    expect(result.current.density).toBe('compact');
  });

  it('ignores invalid persisted values and falls back to default', () => {
    localStorage.setItem('display-density', 'invalid-density');

    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });

    expect(result.current.density).toBe('comfortable');
  });

  it('updates context value and writes to localStorage when setDensity is called', () => {
    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });

    act(() => {
      result.current.setDensity('compact');
    });

    expect(result.current.density).toBe('compact');
    expect(localStorage.getItem('display-density')).toBe('compact');
  });

  it('throws an error if useDensity is called outside of DensityProvider', () => {
    // Suppress console.error output during the expected error throw
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useDensity())).toThrowError(
      'useDensity must be used within a DensityProvider. Did you forget to wrap your component in <DensityProvider>?'
    );

    consoleSpy.mockRestore();
  });

  it('is SSR safe (handles localStorage access safely when window is undefined)', () => {
    // Mock window to be undefined
    const originalWindow = global.window;
    // @ts-ignore - explicitly testing undefined window
    delete global.window;

    // It should not throw when mounting
    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });

    expect(result.current.density).toBe('comfortable');

    // It should not throw when setting density
    act(() => {
      result.current.setDensity('compact');
    });

    expect(result.current.density).toBe('compact');

    // Restore window
    global.window = originalWindow;
  });

  it('handles corrupted localStorage safely (e.g. quota exceeded)', () => {
    // Mock setItem to throw
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });

    // Should update state even if localStorage fails
    act(() => {
      result.current.setDensity('compact');
    });

    expect(result.current.density).toBe('compact');

    setItemSpy.mockRestore();
  });

  it('handles rapid toggling correctly', () => {
    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });

    act(() => {
      result.current.setDensity('compact');
      result.current.setDensity('comfortable');
      result.current.setDensity('compact');
    });

    expect(result.current.density).toBe('compact');
    expect(localStorage.getItem('display-density')).toBe('compact');
  });
});
