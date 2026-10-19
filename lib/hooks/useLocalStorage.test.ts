import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'test_key';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useLocalStorage', () => {
  it('returns the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns the stored value when it exists in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('updates the value and persists to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, 'default'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toBe('updated');
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => useLocalStorage<number>(STORAGE_KEY, 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toBe(1);
  });

  it('handles JSON-serializable complex values', () => {
    const initial = { count: 0, items: [] };
    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, initial));

    act(() => {
      result.current[1]({ count: 5, items: ['a', 'b'] });
    });

    expect(result.current[0]).toEqual({ count: 5, items: ['a', 'b'] });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ count: 5, items: ['a', 'b'] });
  });

  it('handles localStorage write errors gracefully', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, 'default'));

    act(() => {
      result.current[1]('new value');
    });

    expect(result.current[0]).toBe('new value');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('handles localStorage read errors gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('StorageError');
    });

    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns the initial value before useEffect hydrates (SSR-safe)', () => {
    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, 'ssr-safe'));
    expect(result.current[0]).toBe('ssr-safe');
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    expect(() => renderHook(() => useLocalStorage(STORAGE_KEY, 'fallback'))).not.toThrow();
    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('reads updated value from a different hook instance (cross-tab sync baseline)', () => {
    const { result: hookA } = renderHook(() => useLocalStorage(STORAGE_KEY, 'default'));

    act(() => {
      hookA.current[1]('from tab A');
    });

    const { result: hookB } = renderHook(() => useLocalStorage(STORAGE_KEY, 'default'));
    expect(hookB.current[0]).toBe('from tab A');
  });
});
