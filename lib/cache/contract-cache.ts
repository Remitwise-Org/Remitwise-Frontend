/**
 * Contract Cache Layer
 * 
 * Production-grade in-memory caching for Soroban contract read operations.
 * Implements strict type safety, comprehensive error handling, and security best practices.
 * 
 * @module lib/cache/contract-cache
 * @security Input validation, cache poisoning prevention, DoS protection
 * @performance LRU eviction, TTL-based expiration, O(1) lookups
 */

import { LRUCache } from 'lru-cache';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Cache entry with metadata for TTL validation and debugging
 */
interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
  readonly contractId: string;
  readonly method: string;
}

/**
 * Cache statistics for monitoring and observability
 */
export interface CacheStats {
  readonly size: number;
  readonly maxSize: number;
  readonly itemCount: number;
  readonly hitRate?: number;
  readonly missRate?: number;
}

/**
 * Cache operation result for error handling
 */
export interface CacheResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: CacheError;
  readonly fromCache: boolean;
}

/**
 * Custom error types for cache operations
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly code: CacheErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CacheError';
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheError);
    }
  }
}

export enum CacheErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  CACHE_FULL = 'CACHE_FULL',
  FETCH_ERROR = 'FETCH_ERROR',
  INVALID_TTL = 'INVALID_TTL',
  INVALID_CONTRACT_ID = 'INVALID_CONTRACT_ID',
}

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

// Cache size limits - prevent DoS attacks
const CACHE_MAX_SIZE = 500;
const MAX_KEY_LENGTH = 1024; // Prevent excessively long keys
const MAX_ARGS_SIZE = 10240; // 10KB limit for args to prevent memory issues
const MIN_TTL = 1; // Minimum 1 second
const MAX_TTL = 3600; // Maximum 1 hour

// TTL configurations (in seconds) - immutable for security
export const CACHE_TTL = {
  getSplit: 60,
  getConfig: 60,
  getGoals: 30,
  getBills: 30,
  getActivePolicies: 45,
  getTotalMonthlyPremium: 45,
  getPolicy: 45,
} as const;

// Contract identifiers - validated against this whitelist
export const CONTRACT_IDS = {
  REMITTANCE_SPLIT: 'REMITTANCE_SPLIT_CONTRACT',
  SAVINGS_GOALS: 'SAVINGS_GOALS_CONTRACT',
  BILL_PAYMENTS: 'BILL_PAYMENTS_CONTRACT',
  INSURANCE: 'INSURANCE_CONTRACT',
} as const;

// Valid contract IDs for validation
const VALID_CONTRACT_IDS: ReadonlySet<string> = new Set(Object.values(CONTRACT_IDS));

// ============================================================================
// CACHE INSTANCE & METRICS
// ============================================================================

// Initialize LRU cache with proper typing
const cache = new LRUCache<string, CacheEntry<unknown>>({ max: CACHE_MAX_SIZE });

/**
 * In-flight request coalescing map.
 *
 * Maps a cache key to the single pending fetch promise for that key. When
 * several callers miss the cache for the same key concurrently (e.g. the
 * dashboard fanning out parallel reads), only the first ("leader") invokes
 * `fetchFn`; the rest await this shared promise — collapsing N redundant RPC
 * calls into one.
 *
 * @invariant Entries are removed in a `finally` block on BOTH resolve and
 * reject, so a failed fetch never leaves a dangling pending entry (no stuck
 * pending state, no cache poisoning). A rejected flight rejects every waiter
 * with the same error, and the next call retries from scratch.
 * @performance O(1) lookup/insert/delete; keyed identically to the LRU cache.
 */
const inFlight = new Map<string, Promise<unknown>>();

// Metrics tracking for observability (not exposed in production logs)
let cacheHits = 0;
let cacheMisses = 0;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates contract ID against whitelist
 * @security Prevents cache poisoning with invalid contract IDs
 */
function validateContractId(contractId: string): void {
  if (!contractId || typeof contractId !== 'string') {
    throw new CacheError(
      'Contract ID must be a non-empty string',
      CacheErrorCode.INVALID_CONTRACT_ID
    );
  }

  if (!VALID_CONTRACT_IDS.has(contractId)) {
    throw new CacheError(
      `Invalid contract ID: ${contractId}. Must be one of: ${Array.from(VALID_CONTRACT_IDS).join(', ')}`,
      CacheErrorCode.INVALID_CONTRACT_ID,
      { providedId: contractId, validIds: Array.from(VALID_CONTRACT_IDS) }
    );
  }
}

/**
 * Validates method name
 * @security Prevents injection attacks via method names
 */
function validateMethod(method: string): void {
  if (!method || typeof method !== 'string') {
    throw new CacheError(
      'Method must be a non-empty string',
      CacheErrorCode.INVALID_INPUT
    );
  }

  // Method names should be alphanumeric with underscores only
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(method)) {
    throw new CacheError(
      `Invalid method name: ${method}. Must be alphanumeric with underscores`,
      CacheErrorCode.INVALID_INPUT,
      { method }
    );
  }
}

/**
 * Validates TTL value
 * @security Prevents DoS via extremely long TTLs
 */
function validateTTL(ttlSeconds: number): void {
  if (typeof ttlSeconds !== 'number' || !Number.isFinite(ttlSeconds)) {
    throw new CacheError(
      'TTL must be a finite number',
      CacheErrorCode.INVALID_TTL,
      { ttl: ttlSeconds }
    );
  }

  if (ttlSeconds < MIN_TTL || ttlSeconds > MAX_TTL) {
    throw new CacheError(
      `TTL must be between ${MIN_TTL} and ${MAX_TTL} seconds`,
      CacheErrorCode.INVALID_TTL,
      { ttl: ttlSeconds, min: MIN_TTL, max: MAX_TTL }
    );
  }
}

/**
 * Validates and sanitizes arguments object
 * @security Prevents cache poisoning and DoS via large payloads
 */
function validateArgs(args: Record<string, unknown>): void {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    throw new CacheError(
      'Args must be a plain object',
      CacheErrorCode.INVALID_INPUT,
      { args }
    );
  }

  // Check serialized size to prevent memory issues
  try {
    const serialized = JSON.stringify(args);
    if (serialized.length > MAX_ARGS_SIZE) {
      throw new CacheError(
        `Args size exceeds maximum of ${MAX_ARGS_SIZE} bytes`,
        CacheErrorCode.INVALID_INPUT,
        { size: serialized.length, max: MAX_ARGS_SIZE }
      );
    }
  } catch (error) {
    if (error instanceof CacheError) throw error;
    throw new CacheError(
      'Args must be JSON serializable',
      CacheErrorCode.SERIALIZATION_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// CORE CACHE FUNCTIONS
// ============================================================================

/**
 * Generates a deterministic cache key with validation
 * @security Validates all inputs, limits key length
 */
function generateCacheKey(
  contractId: string,
  method: string,
  args: Record<string, unknown>
): string {
  // Validate inputs
  validateContractId(contractId);
  validateMethod(method);
  validateArgs(args);

  // Sort keys for deterministic serialization
  const sortedArgs = Object.keys(args)
    .sort()
    .reduce((acc, key) => {
      acc[key] = args[key];
      return acc;
    }, {} as Record<string, unknown>);

  const argsHash = JSON.stringify(sortedArgs);
  const key = `${contractId}:${method}:${argsHash}`;

  // Validate key length
  if (key.length > MAX_KEY_LENGTH) {
    throw new CacheError(
      `Cache key exceeds maximum length of ${MAX_KEY_LENGTH}`,
      CacheErrorCode.INVALID_INPUT,
      { keyLength: key.length, max: MAX_KEY_LENGTH }
    );
  }

  return key;
}

/**
 * Cached contract call with comprehensive error handling
 * 
 * @param contractId - Contract identifier (must be in CONTRACT_IDS)
 * @param method - Contract method name (alphanumeric + underscore)
 * @param args - Method arguments (must be JSON serializable, < 10KB)
 * @param ttlSeconds - Time-to-live (1-3600 seconds)
 * @param fetchFn - Async function that performs the actual contract call
 * @returns Promise resolving to cached or fresh data
 * @throws CacheError for validation failures
 * @throws Original error from fetchFn if fetch fails
 */
export async function cachedContractCall<T>(
  contractId: string,
  method: string,
  args: Record<string, unknown>,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Validate all inputs before proceeding
  validateContractId(contractId);
  validateMethod(method);
  validateArgs(args);
  validateTTL(ttlSeconds);

  if (typeof fetchFn !== 'function') {
    throw new CacheError(
      'fetchFn must be a function',
      CacheErrorCode.INVALID_INPUT
    );
  }

  let cacheKey: string;
  try {
    cacheKey = generateCacheKey(contractId, method, args);
  } catch (error) {
    // If key generation fails, bypass cache and fetch directly
    if (error instanceof CacheError) {
      throw error;
    }
    throw new CacheError(
      'Failed to generate cache key',
      CacheErrorCode.SERIALIZATION_ERROR,
      { originalError: error }
    );
  }

  // Check cache with error handling
  try {
    const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;

    if (cached) {
      // Verify TTL hasn't expired
      const age = Date.now() - cached.timestamp;
      if (age < ttlSeconds * 1000) {
        // Additional validation: ensure cached TTL matches requested TTL
        // This prevents TTL confusion attacks
        if (cached.ttl === ttlSeconds) {
          cacheHits++;
          return cached.data;
        }
      }
      // Expired or TTL mismatch - remove from cache
      cache.delete(cacheKey);
    }
  } catch (error) {
    // Cache read error - log but continue to fetch
    // In production, this should be sent to monitoring system
    // Don't throw - degrade gracefully
  }

  // Cache miss - fetch fresh data
  cacheMisses++;

  // In-flight coalescing: if another caller is already fetching this exact key,
  // await their pending promise instead of issuing a duplicate network call.
  // This collapses concurrent cold-cache misses into a single RPC round-trip.
  const pending = inFlight.get(cacheKey) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  // We are the leader for this key. Build a single shared flight that performs
  // the fetch, validates, and populates the cache. Any concurrent callers that
  // miss while this is pending will await the very same promise above.
  const flight = (async (): Promise<T> => {
    // Fetch failed - the original (business-logic) error propagates to every
    // waiter unwrapped; nothing is cached, so there is no poisoning.
    const data = await fetchFn();

    // Validate fetched data is not undefined/null before caching
    if (data === undefined || data === null) {
      throw new CacheError(
        'fetchFn returned null or undefined - cannot cache',
        CacheErrorCode.INVALID_INPUT,
        { contractId, method }
      );
    }

    // Store in cache with error handling
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds,
        contractId,
        method,
      };

      cache.set(cacheKey, entry as CacheEntry<unknown>);
    } catch (error) {
      // Cache write error - log but return data
      // In production, this should be sent to monitoring system
      // Don't throw - data was fetched successfully
    }

    return data;
  })();

  inFlight.set(cacheKey, flight);

  try {
    return await flight;
  } finally {
    // Clear the in-flight entry on BOTH resolve and reject so the map never
    // retains a settled/dangling promise. On rejection the next call retries.
    inFlight.delete(cacheKey);
  }
}

/**
 * Invalidates a specific cache entry with validation
 * 
 * @param contractId - Contract identifier
 * @param method - Contract method name
 * @param args - Method arguments used in the original call
 * @returns true if entry was found and deleted, false otherwise
 */
export function invalidate(
  contractId: string,
  method: string,
  args: Record<string, unknown> = {}
): boolean {
  try {
    validateContractId(contractId);
    validateMethod(method);
    validateArgs(args);

    const cacheKey = generateCacheKey(contractId, method, args);
    const existed = cache.has(cacheKey);
    cache.delete(cacheKey);
    return existed;
  } catch (error) {
    // Validation error - throw to caller
    if (error instanceof CacheError) {
      throw error;
    }
    throw new CacheError(
      'Failed to invalidate cache entry',
      CacheErrorCode.INVALID_INPUT,
      { originalError: error }
    );
  }
}

/**
 * Invalidates all cache entries matching a pattern
 * 
 * @param pattern - Pattern to match (validated for safety)
 * @returns Number of entries invalidated
 * @security Pattern is validated to prevent ReDoS attacks
 */
export function invalidatePattern(pattern: string): number {
  if (!pattern || typeof pattern !== 'string') {
    throw new CacheError(
      'Pattern must be a non-empty string',
      CacheErrorCode.INVALID_INPUT
    );
  }

  // Validate pattern length to prevent DoS
  if (pattern.length > MAX_KEY_LENGTH) {
    throw new CacheError(
      `Pattern exceeds maximum length of ${MAX_KEY_LENGTH}`,
      CacheErrorCode.INVALID_INPUT,
      { patternLength: pattern.length }
    );
  }

  // Validate pattern doesn't contain dangerous regex characters
  // Only allow alphanumeric, underscore, colon, and basic JSON characters
  if (!/^[a-zA-Z0-9_:{}",\s-]+$/.test(pattern)) {
    throw new CacheError(
      'Pattern contains invalid characters',
      CacheErrorCode.INVALID_INPUT,
      { pattern }
    );
  }

  let count = 0;
  const keys = cache.keys();

  for (const key of keys) {
    if (typeof key === 'string' && key.includes(pattern)) {
      cache.delete(key);
      count++;
    }
  }

  return count;
}

/**
 * Clears all cache entries from memory and resets cache hits/misses metrics.
 *
 * Also drops any tracked in-flight promises so a clear (including a
 * registry-driven `clearRegisteredCaches()`) fully resets cache state. Already
 * pending flights still settle and clean up their own entry harmlessly via the
 * `finally` in {@link cachedContractCall}; subsequent callers start fresh.
 *
 * @security Should be restricted in production environments to avoid performance degradation.
 */
export function clearCache(): void {
  cache.clear();
  inFlight.clear();
  // Reset metrics
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Retrieves the current cache metrics and statistics for monitoring and observability.
 * 
 * @returns An object containing the cache size, maxSize, itemCount, hitRate, and missRate.
 */
export function getCacheStats(): CacheStats {
  const total = cacheHits + cacheMisses;
  return {
    size: cache.size,
    maxSize: CACHE_MAX_SIZE,
    itemCount: cache.size,
    hitRate: total > 0 ? cacheHits / total : undefined,
    missRate: total > 0 ? cacheMisses / total : undefined,
  };
}

/**
 * Retrieves all keys currently stored in the cache.
 * 
 * @returns A frozen read-only array of cache keys.
 * @security Access should be restricted in production environments to prevent information disclosure.
 */
export function getCacheKeys(): readonly string[] {
  return Object.freeze([...cache.keys()]);
}

/**
 * Resets cache metrics (for testing)
 * @internal
 */
export function resetMetrics(): void {
  cacheHits = 0;
  cacheMisses = 0;
}
