/**
 * Idempotency Configuration
 * 
 * Centralized configuration for idempotency behavior
 */

export const IDEMPOTENCY_CONFIG = {
    // Default TTL for idempotency records (24 hours)
    DEFAULT_TTL_MS: 24 * 60 * 60 * 1000,

    // Cleanup interval (1 hour)
    CLEANUP_INTERVAL_MS: 60 * 60 * 1000,

    // Header name for idempotency key
    HEADER_NAME: 'idempotency-key',

    // Header name for replay indicator
    REPLAY_HEADER_NAME: 'x-idempotent-replay',

    // Maximum key length
    MAX_KEY_LENGTH: 255,

    // Minimum key length
    MIN_KEY_LENGTH: 1,
} as const;
