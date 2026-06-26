export const WIDGET_FETCH_RETRY_CONFIG: {
  maxRetries: number;
  baseBackoffMs: number;
} = {
  maxRetries: 3,
  baseBackoffMs: 300,
};

export interface WidgetFetchRetryOptions<T> {
  load: () => Promise<T>;
  signal?: AbortSignal;
  maxRetries?: number;
  baseBackoffMs?: number;
}

export function computeWidgetFetchRetryDelay(
  retryIndex: number,
  baseBackoffMs = WIDGET_FETCH_RETRY_CONFIG.baseBackoffMs
): number {
  return baseBackoffMs * 2 ** retryIndex;
}

function toAbortError(signal?: AbortSignal): Error {
  const reason = signal?.reason;
  if (reason instanceof Error) {
    return reason;
  }

  return new DOMException('The operation was aborted.', 'AbortError');
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(toAbortError(signal));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
      reject(toAbortError(signal));
    };

    signal?.addEventListener('abort', onAbort);
  });
}

export async function runWidgetFetchWithRetry<T>({
  load,
  signal,
  maxRetries = WIDGET_FETCH_RETRY_CONFIG.maxRetries,
  baseBackoffMs = WIDGET_FETCH_RETRY_CONFIG.baseBackoffMs,
}: WidgetFetchRetryOptions<T>): Promise<T> {
  let retryCount = 0;

  for (;;) {
    if (signal?.aborted) {
      throw toAbortError(signal);
    }

    try {
      return await load();
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) {
        throw toAbortError(signal);
      }

      if (retryCount >= maxRetries) {
        throw error;
      }

      await delay(computeWidgetFetchRetryDelay(retryCount, baseBackoffMs), signal);
      retryCount += 1;
    }
  }
}
