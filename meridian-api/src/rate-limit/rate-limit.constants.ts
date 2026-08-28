export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
} as const;

export type RateLimitTier = 'read' | 'write';

export const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
