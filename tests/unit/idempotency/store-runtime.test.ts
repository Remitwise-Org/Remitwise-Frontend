import { afterEach, describe, expect, it, vi } from 'vitest';

const CLEANUP_TIMER_KEY = '__remitwiseIdempotencyCleanupTimer';

describe('idempotency store runtime integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('../../../lib/background/runtime');
    vi.doUnmock('../../../lib/cache/registry');
    delete (globalThis as typeof globalThis & Record<string, unknown>)[CLEANUP_TIMER_KEY];
  });

  it('unrefs the cleanup interval and registers shutdown/cache clearers', async () => {
    const registeredHooks = new Map<string, () => void | Promise<void>>();
    const registeredCaches = new Map<string, () => void | Promise<void>>();
    const timer = { unref: vi.fn() } as unknown as ReturnType<typeof setInterval>;

    const setIntervalSpy = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(timer);
    const clearIntervalSpy = vi
      .spyOn(globalThis, 'clearInterval')
      .mockImplementation(() => undefined);

    vi.doMock('../../../lib/background/runtime', () => ({
      registerShutdownHook: vi.fn((name: string, hook: () => void | Promise<void>) => {
        registeredHooks.set(name, hook);
      }),
    }));
    vi.doMock('../../../lib/cache/registry', () => ({
      registerCache: vi.fn((name: string, clearer: () => void | Promise<void>) => {
        registeredCaches.set(name, clearer);
      }),
    }));

    const store = await import('../../../lib/idempotency/store');

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000);
    expect(timer.unref).toHaveBeenCalledTimes(1);
    expect(registeredHooks.has('idempotency_store_cleanup')).toBe(true);
    expect(registeredCaches.has('idempotency_store')).toBe(true);

    store.storeIdempotencyRecord('shutdown-key', 'hash', { status: 200, body: {} });
    expect(store.getStoreSize()).toBe(1);

    await registeredCaches.get('idempotency_store')?.();
    expect(store.getStoreSize()).toBe(0);

    await registeredHooks.get('idempotency_store_cleanup')?.();
    expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
    expect((globalThis as typeof globalThis & Record<string, unknown>)[CLEANUP_TIMER_KEY]).toBeUndefined();
  });

  it('reuses an existing cleanup timer during module re-evaluation', async () => {
    const existingTimer = { unref: vi.fn() } as unknown as ReturnType<typeof setInterval>;
    (globalThis as typeof globalThis & Record<string, unknown>)[CLEANUP_TIMER_KEY] = existingTimer;

    const setIntervalSpy = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(existingTimer);

    vi.doMock('../../../lib/background/runtime', () => ({
      registerShutdownHook: vi.fn(),
    }));
    vi.doMock('../../../lib/cache/registry', () => ({
      registerCache: vi.fn(),
    }));

    await import('../../../lib/idempotency/store');

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(existingTimer.unref).not.toHaveBeenCalled();
  });
});
