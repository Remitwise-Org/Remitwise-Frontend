export const SWR_DEFAULTS = {
  staleTime: 30_000,
  gcTime: 5 * 60 * 1000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30_000),
} as const;

export const HEALTH_PING_INTERVAL_MS = 60_000;
