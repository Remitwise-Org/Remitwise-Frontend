export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
} as const;

export const RATE_LIMIT_MIN_WINDOW_MS = 1000;
export const RATE_LIMIT_MAX_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX_LIMIT = 1000;
export const RATE_LIMIT_MAX_ABUSE_THRESHOLD = 1000;

export type RateLimitTier = 'read' | 'write';

export const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
