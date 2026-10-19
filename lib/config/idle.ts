/**
 * Configuration constants for browser idle callback scheduling and fallback polyfills.
 */

/**
 * Fallback delay (in milliseconds) used by the setTimeout wrapper when requestIdleCallback
 * is unsupported (e.g., in Safari or legacy environments).
 */
export const IDLE_CALLBACK_FALLBACK_DELAY_MS = 1;

/**
 * Default frame budget limit (in milliseconds) allocated for idle deadline calculation
 * when fallback polyfill is active.
 */
export const IDLE_CALLBACK_DEFAULT_TIMEOUT_MS = 50;
