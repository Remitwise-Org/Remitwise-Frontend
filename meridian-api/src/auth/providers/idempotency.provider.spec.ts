import {
  IdempotencyConflictError,
  IdempotencyProvider,
  InMemoryIdempotencyStore,
} from './idempotency.provider';

describe('IdempotencyProvider (issue #1689)', () => {
  let provider: IdempotencyProvider;

  beforeEach(() => {
    provider = new IdempotencyProvider({ ttlMs: 60_000 });
  });

  it('executes the operation once and returns its result', async () => {
    const operation = jest.fn(async () => ({ ok: true }));

    const result = await provider.execute('key-1', { a: 1 }, operation);

    expect(result).toEqual({ ok: true });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('runs concurrent requests with the same key exactly once and shares the result', async () => {
    let release!: (value: string) => void;
    const gate = new Promise<string>((resolve) => {
      release = resolve;
    });
    const operation = jest.fn(async () => gate);

    const first = provider.execute('key-1', { a: 1 }, operation);
    // While the first execution is still in flight, several sibling requests
    // arrive with the same key and the same payload.
    const siblings = [
      provider.execute('key-1', { a: 1 }, operation),
      provider.execute('key-1', { a: 1 }, operation),
      provider.execute('key-1', { a: 1 }, operation),
    ];

    release('result');
    const [r0, r1, r2, r3] = await Promise.all([first, ...siblings]);

    expect(operation).toHaveBeenCalledTimes(1);
    // Every caller — the original and the concurrent retries — observes the
    // identical response. This is the multi-tab dedup guarantee.
    expect([r0, r1, r2, r3]).toEqual(['result', 'result', 'result', 'result']);
  });

  it('replays the stored result for a retry after success (no re-execution)', async () => {
    const operation = jest.fn(async () => ({ token: 'abc' }));

    const first = await provider.execute('key-1', { a: 1 }, operation);
    const retry = await provider.execute('key-1', { a: 1 }, operation);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(retry).toEqual(first);
  });

  it('rejects key reuse with a different payload without executing anything', async () => {
    const operation = jest.fn(async () => 'done');

    await provider.execute('key-1', { a: 1 }, operation);

    await expect(
      provider.execute('key-1', { a: 2 }, operation),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('rejects conflicting reuse even while the original execution is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const operation = jest.fn(async () => gate);

    const first = provider.execute('key-1', { a: 1 }, operation);
    // This call queues behind the in-flight execution on the per-key mutex;
    // once it runs it must observe the payload mismatch and conflict.
    const conflicting = provider.execute('key-1', { a: 2 }, operation);
    const conflictingAssertion = expect(conflicting).rejects.toBeInstanceOf(
      IdempotencyConflictError,
    );

    release();
    await first;
    await conflictingAssertion;
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('treats a failed operation as retryable: the same key re-runs once', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('recovered');

    await expect(
      provider.execute('key-1', { a: 1 }, operation),
    ).rejects.toThrow('transient');

    const retry = await provider.execute('key-1', { a: 1 }, operation);

    expect(retry).toBe('recovered');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('serializes a retry against an in-flight failure without double execution', async () => {
    let fail = true;
    let executions = 0;
    const operation = jest.fn(async () => {
      executions++;
      if (fail) {
        throw new Error('flaky');
      }
      return 'ok';
    });

    await expect(
      provider.execute('key-1', { a: 1 }, operation),
    ).rejects.toThrow('flaky');

    fail = false;
    // Hammer the same key concurrently after the failure: the per-key mutex
    // must serialize them so the operation re-runs exactly once.
    const results = await Promise.all([
      provider.execute('key-1', { a: 1 }, operation),
      provider.execute('key-1', { a: 1 }, operation),
      provider.execute('key-1', { a: 1 }, operation),
    ]);

    expect(results).toEqual(['ok', 'ok', 'ok']);
    expect(executions).toBe(2); // 1 failed attempt + 1 successful re-run
  });

  it('treats an expired record as absent (state is rebuilt from scratch)', async () => {
    const store = new InMemoryIdempotencyStore();
    const shortTtl = new IdempotencyProvider({ store, ttlMs: 1 });
    const operation = jest.fn(async () => 'first');

    await shortTtl.execute('key-1', { a: 1 }, operation);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const afterExpiry = await shortTtl.execute('key-1', { a: 1 }, operation);
    expect(afterExpiry).toBe('first');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(await store.get('key-1')).toBeDefined();
  });

  it('does not collide across different keys', async () => {
    const operation = jest.fn(async (payload: unknown) => payload);

    await Promise.all([
      provider.execute('key-a', { a: 1 }, () => operation('a')),
      provider.execute('key-b', { a: 1 }, () => operation('b')),
    ]);

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('requires a non-empty key', async () => {
    await expect(provider.execute('', {}, async () => 'x')).rejects.toThrow(
      'Idempotency key is required',
    );
  });
});
