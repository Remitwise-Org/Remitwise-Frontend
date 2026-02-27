/**
 * Data Sanitization for Audit Logs
 * 
 * Ensures no sensitive information (passwords, keys, tokens) is logged.
 */

/**
 * List of field names that should never be logged
 */
const SENSITIVE_FIELDS = [
  'password',
  'privateKey',
  'private_key',
  'secret',
  'signature',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'sessionId',
  'session_id',
  'apiKey',
  'api_key',
  'AUTH_SECRET',
  'SESSION_PASSWORD',
];

/**
 * Mask a Stellar address (show first 6 and last 4 characters)
 * @param address Full Stellar address
 * @returns Masked address (e.g., GDEMOX...XXXX)
 */
export function maskAddress(address: string): string {
  if (!address || address.length < 10) {
    return '***';
  }
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Sanitize an object by removing sensitive fields
 * @param data Object to sanitize
 * @param deep Whether to recursively sanitize nested objects
 * @returns Sanitized copy of the object
 */
export function sanitize(data: any, deep: boolean = true): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Primitive types - return as-is
  if (typeof data !== 'object') {
    return data;
  }

  // Arrays
  if (Array.isArray(data)) {
    return deep ? data.map(item => sanitize(item, deep)) : data;
  }

  // Objects
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Skip sensitive fields
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    if (deep && value && typeof value === 'object') {
      sanitized[key] = sanitize(value, deep);
    } else {
      // Truncate very long strings
      if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + '... [TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize an error for logging (remove stack traces with sensitive info)
 * @param error Error object
 * @returns Sanitized error message
 */
export function sanitizeError(error: any): string {
  if (!error) {
    return 'Unknown error';
  }

  // If it's a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it has a message property, use it
  if (error.message) {
    return error.message;
  }

  // Otherwise stringify
  return String(error);
}

/**
 * Extract safe metadata from request body
 * Removes sensitive fields and limits size
 * @param body Request body
 * @returns Sanitized metadata
 */
export function extractSafeMetadata(body: any): Record<string, any> | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const sanitized = sanitize(body, true);

  // Limit metadata size
  const jsonString = JSON.stringify(sanitized);
  if (jsonString.length > 1000) {
    return {
      _note: 'Metadata truncated due to size',
      _size: jsonString.length,
    };
  }

  return sanitized;
}
