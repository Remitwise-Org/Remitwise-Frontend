import {
  HttpRateLimitStore,
  MemoryRateLimitStore,
  type RateLimitStore,
} from './store';

export { evaluateSlidingWindow } from './sliding-window';
export {
  HttpRateLimitStore,
  MemoryRateLimitStore,
  type RateLimitDecision,
  type RateLimitStore,
} from './store';

export function createRateLimitStore(): RateLimitStore {
  const endpoint = process.env.RATE_LIMIT_STORE_URL;
  return endpoint
    ? new HttpRateLimitStore(endpoint)
    : new MemoryRateLimitStore();
}
