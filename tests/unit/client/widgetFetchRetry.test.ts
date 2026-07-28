import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  WIDGET_FETCH_RETRY_CONFIG,
  computeWidgetFetchRetryDelay,
  runWidgetFetchWithRetry,
} from '@/lib/client/widgetFetchRetry';

describe('widget fetch retry helper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses exponential backoff from the shared config', () => {
    expect(WIDGET_FETCH_RETRY_CONFIG.maxRetries).toBe(3);
    expect(computeWidgetFetchRetryDelay(0)).toBe(300);
    expect(computeWidgetFetchRetryDelay(1)).toBe(600);
    expect(computeWidgetFetchRetryDelay(2)).toBe(1200);
  });

  it('succeeds on a later retry before exhaustion', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockRejectedValueOnce(new Error('still temporary'))
      .mockResolvedValueOnce('ok');

    const promise = runWidgetFetchWithRetry({
      load,
      baseBackoffMs: 10,
    });

    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10);
    expect(load).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(20);
    await expect(promise).resolves.toBe('ok');
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all retries', async () => {
    const load = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('down'));

    const rejection = runWidgetFetchWithRetry({
      load,
      baseBackoffMs: 10,
    }).catch((error) => error);

    await Promise.resolve();
    await vi.runAllTimersAsync();

    const error = await rejection;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('down');
    expect(load).toHaveBeenCalledTimes(4);
  });

  it('stops retrying when the caller aborts', async () => {
    const controller = new AbortController();
    const load = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('down'));

    const promise = runWidgetFetchWithRetry({
      load,
      signal: controller.signal,
      baseBackoffMs: 10,
    });

    await Promise.resolve();
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(load).toHaveBeenCalledTimes(1);
  });
});
