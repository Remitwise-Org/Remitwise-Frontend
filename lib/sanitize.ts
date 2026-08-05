/**
 * Sanitization utilities for logging sensitive data
 * Redacts or masks sensitive fields to prevent exposure in logs
 */

const SENSITIVE_FIELDS = new Set([
  'password',
  'secret',
  'token',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'sessionid',
  'session_id',
  'refreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'authorization',
  'creditcard',
  'credit_card',
  'ssn',
  'pin',
]);

const PARTIAL_MASK_FIELDS = new Set([
  'email',
  'address',
  'phone',
  'publickey',
  'public_key',
  'walletaddress',
  'wallet_address',
  'contractaddress',
  'contract_address',
  'contractid',
  'contract_id',
]);

const MAX_DEPTH = 5;

/**
 * Partially masks an email address
 * user@example.com → us***@***
 */
function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '[INVALID]';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[INVALID]';
  const maskedLocal = local.substring(0, 2) + '***';
  const maskedDomain = '***';
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Partially masks a wallet address (Stellar or similar)
 * GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX → GBXXXX***
 */
function maskAddress(address: string): string {
  if (!address || typeof address !== 'string') return '[INVALID]';
  if (address.length < 8) return '[INVALID]';
  return address.substring(0, 6) + '***';
}

/**
 * Partially masks a wallet address for safe inclusion in logs/telemetry.
 * Public wrapper around the internal {@link maskAddress} helper.
 */
export function sanitizeWalletAddress(address: string): string {
  return maskAddress(address);
}

/**
 * Partially masks a Soroban contract address/ID for safe inclusion in
 * logs/telemetry. Public wrapper around the internal {@link maskAddress}
 * helper, mirroring {@link sanitizeWalletAddress}.
 */
export function sanitizeContractAddress(address: string): string {
  return maskAddress(address);
}

/**
 * Partially masks a phone number
 * +1234567890 → +123***7890
 */
function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '[INVALID]';
  if (phone.length < 6) return '[INVALID]';
  const start = phone.substring(0, 3);
  const end = phone.substring(phone.length - 4);
  return `${start}***${end}`;
}

/**
 * Sanitizes an object by redacting or masking sensitive fields
 * Recursively processes nested objects up to MAX_DEPTH
 */
export function sanitizeObject(
  obj: any,
  depth: number = 0,
): any {
  // Stop recursion at max depth
  if (depth >= MAX_DEPTH) {
    return '[TRUNCATED]';
  }

  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  // Handle objects
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field should be fully redacted
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Check if field should be partially masked
    if (PARTIAL_MASK_FIELDS.has(lowerKey)) {
      if (typeof value === 'string') {
        if (lowerKey === 'email') {
          sanitized[key] = maskEmail(value);
        } else if (
          lowerKey === 'address' ||
          lowerKey === 'publickey' ||
          lowerKey === 'public_key' ||
          lowerKey === 'walletaddress' ||
          lowerKey === 'wallet_address' ||
          lowerKey === 'contractaddress' ||
          lowerKey === 'contract_address' ||
          lowerKey === 'contractid' ||
          lowerKey === 'contract_id'
        ) {
          sanitized[key] = maskAddress(value);
        } else if (lowerKey === 'phone') {
          sanitized[key] = maskPhone(value);
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/** Maximum length a search query is allowed to reach before being truncated. */
const MAX_SEARCH_QUERY_LENGTH = 200;

/**
 * Sanitizes a free-text search query before it is used to filter data,
 * rendered back into the page, or interpolated into a URL (e.g. a future
 * `?q=` sync or an outbound API request).
 *
 * - Strips ASCII control characters (including newlines/tabs), which have no
 *   legitimate place in a search query and can otherwise smuggle CRLF/log
 *   injection or corrupt a query string.
 * - Collapses runs of whitespace and trims the result.
 * - Caps the length at {@link MAX_SEARCH_QUERY_LENGTH} to bound both the
 *   rendered output and any URL built from it.
 *
 * This does not URL-encode the result — callers building a URL from the
 * output must still use `URLSearchParams`/`encodeURIComponent`, the same as
 * for any other value.
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';

  // eslint-disable-next-line no-control-regex -- intentionally stripping control chars
  const withoutControlChars = query.replace(/[\x00-\x1F\x7F]/g, '');
  const collapsedWhitespace = withoutControlChars.replace(/\s+/g, ' ').trim();

  return collapsedWhitespace.slice(0, MAX_SEARCH_QUERY_LENGTH);
}

/**
 * Sanitizes a string by removing or masking sensitive patterns
 * Useful for sanitizing log messages
 */
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;

  // Mask common patterns
  let sanitized = str;

  // Mask API keys (generic pattern)
  sanitized = sanitized.replace(
    /(^|[^\w-])api[_-]?key[=:\s]+[^\s,}]+/gi,
    '$1api_key=[REDACTED]',
  );

  // Mask tokens
  sanitized = sanitized.replace(
    /(^|[^\w-])token[=:\s]+[^\s,}]+/gi,
    '$1token=[REDACTED]',
  );

  // Mask passwords
  sanitized = sanitized.replace(
    /(^|[^\w-])password[=:\s]+[^\s,}]+/gi,
    '$1password=[REDACTED]',
  );

  // Mask Bearer tokens
  sanitized = sanitized.replace(
    /Bearer\s+[^\s,}]+/gi,
    'Bearer [REDACTED]',
  );

  return sanitized;
}
