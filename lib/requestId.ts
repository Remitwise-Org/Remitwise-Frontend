/**
 * Request ID generation and management
 * Provides unique identifiers for tracking requests through logs
 */

/**
 * Generates a unique request ID
 * Format: timestamp-random (e.g., 1234567890-abc123)
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Validates a request ID format
 */
export function isValidRequestId(id: string): boolean {
  if (typeof id !== 'string') return false;
  // Basic format check: should contain a dash and be reasonably short
  return /^[a-z0-9]+-[a-z0-9]+$/.test(id) && id.length < 50;
}

/**
 * Extracts request ID from headers or generates a new one
 */
export function getOrGenerateRequestId(
  headers?: Record<string, string | string[] | undefined>,
): string {
  if (!headers) return generateRequestId();

  // Check for common request ID header names
  const headerNames = [
    'x-request-id',
    'x-correlation-id',
    'request-id',
    'correlation-id',
  ];

  for (const headerName of headerNames) {
    const value = headers[headerName];
    if (value) {
      const idValue = Array.isArray(value) ? value[0] : value;
      if (isValidRequestId(idValue)) {
        return idValue;
      }
    }
  }

  return generateRequestId();
}
