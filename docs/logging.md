# API Request/Response Logging

This document describes the structured logging middleware for API requests and responses.

## Overview

The logging system provides:
- **Structured JSON logging** for all API requests and responses
- **Automatic sanitization** of sensitive data (passwords, tokens, API keys, etc.)
- **Request tracking** via unique request IDs
- **Configurable log levels** (debug, info, warn, error)
- **Zero logging of request bodies** to prevent sensitive data exposure

## Configuration

Set the `LOG_LEVEL` environment variable to control logging verbosity:

```bash
# .env.local
LOG_LEVEL=info  # debug, info, warn, error (default: info)
```

## Log Levels

- **debug**: Detailed diagnostic information (development only)
- **info**: General informational messages (default)
- **warn**: Warning messages (includes 4xx responses)
- **error**: Error messages only

## Log Entry Structure

### Request Log

```json
{
  "requestId": "1a2b3c4d-5e6f7g8h",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "type": "request",
  "method": "POST",
  "path": "/api/auth/login",
  "userAgent": "Mozilla/5.0..."
}
```

**Note**: Request bodies are never logged to prevent sensitive data exposure.

### Response Log

```json
{
  "requestId": "1a2b3c4d-5e6f7g8h",
  "timestamp": "2024-01-15T10:30:45.234Z",
  "level": "info",
  "type": "response",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 200,
  "durationMs": 111,
  "data": {
    "user": {
      "id": "user-123",
      "email": "us***@***",
      "password": "[REDACTED]"
    }
  }
}
```

Response data is automatically sanitized before logging.

### Error Log

```json
{
  "requestId": "1a2b3c4d-5e6f7g8h",
  "timestamp": "2024-01-15T10:30:45.345Z",
  "level": "error",
  "type": "error",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 500,
  "durationMs": 50,
  "error": "Database connection failed",
  "stack": "Error: Database connection failed\n    at..."
}
```

## Sanitization Rules

### Fully Redacted Fields

The following fields are completely redacted with `[REDACTED]`:

- `password`, `secret`, `token`, `apiKey`, `api_key`
- `privateKey`, `private_key`, `sessionId`, `session_id`
- `refreshToken`, `refresh_token`, `accessToken`, `access_token`
- `authorization`, `creditCard`, `credit_card`, `ssn`, `pin`

### Partially Masked Fields

The following fields are partially masked to preserve format while hiding sensitive data:

- **email**: `user@example.com` → `us***@***`
- **address** (Stellar/wallet): `GBXXXXX...` → `GBXXXX***`
- **phone**: `+1234567890` → `+12***7890`
- **publicKey**: `GBXXXXX...` → `GBXXXX***`

### Safe Fields

All other fields are logged as-is:

- `id`, `name`, `status`, `amount`, `currency`
- `timestamp`, `createdAt`, `updatedAt`
- Any custom fields not in the sensitive list

## Request ID Tracking

Each request receives a unique request ID that appears in both request and response logs:

```
requestId: "1a2b3c4d-5e6f7g8h"
```

This enables end-to-end request tracing across logs.

### Request ID Sources

The middleware checks for existing request IDs in this order:
1. `X-Request-ID` header
2. `X-Correlation-ID` header
3. `Request-ID` header
4. `Correlation-ID` header
5. Generates a new ID if none found

## Middleware Behavior

### Routes Affected

Logging is applied to all `/api/*` routes:

- ✅ `/api/auth/login`
- ✅ `/api/bills`
- ✅ `/api/dashboard`
- ❌ `/api/health` (whitelisted, no logging)
- ❌ Static files and pages (not matched by middleware)

### Request/Response Headers

The middleware adds the following headers:

- `X-Request-ID`: Unique request identifier
- `X-RateLimit-Limit`: Rate limit threshold
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Usage Examples

### Reading Logs

Parse JSON logs from stdout:

```bash
# View all logs
npm run dev 2>&1 | grep "requestId"

# Filter by request ID
npm run dev 2>&1 | grep "1a2b3c4d-5e6f7g8h"

# Filter by status code
npm run dev 2>&1 | grep '"statusCode":500'

# Filter by path
npm run dev 2>&1 | grep '"/api/auth'
```

### Using Request IDs in Client Code

```typescript
// Send request with custom request ID
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'X-Request-ID': 'my-custom-id-123',
  },
  body: JSON.stringify({ email: 'user@example.com' }),
});

// Get request ID from response
const requestId = response.headers.get('X-Request-ID');
console.log(`Request ID: ${requestId}`);
```

## Security Considerations

### What Is NOT Logged

- Request bodies (completely excluded)
- Response bodies containing sensitive data (automatically sanitized)
- Full sensitive field values (redacted or masked)
- Passwords, tokens, API keys, private keys
- Credit card numbers, SSNs, PINs

### What IS Logged

- Request method and path
- Response status code and duration
- Request ID for tracing
- User agent (safe to log)
- Sanitized response data

### Best Practices

1. **Never log request bodies** - The middleware enforces this
2. **Review sensitive fields** - Add custom fields to `SENSITIVE_FIELDS` if needed
3. **Monitor logs in production** - Use log aggregation services
4. **Rotate logs regularly** - Implement log retention policies
5. **Restrict log access** - Limit who can view logs

## Customization

### Adding Custom Sensitive Fields

Edit `lib/sanitize.ts` to add fields to the `SENSITIVE_FIELDS` set:

```typescript
const SENSITIVE_FIELDS = new Set([
  'password',
  'apiKey',
  'myCustomSensitiveField', // Add here
]);
```

### Adding Custom Partial Mask Fields

Edit `lib/sanitize.ts` to add fields to the `PARTIAL_MASK_FIELDS` set:

```typescript
const PARTIAL_MASK_FIELDS = new Set([
  'email',
  'address',
  'myCustomMaskField', // Add here
]);
```

### Changing Recursion Depth

Edit `lib/sanitize.ts` to adjust `MAX_DEPTH`:

```typescript
const MAX_DEPTH = 5; // Change to desired depth
```

## Testing

Run the test suite to verify sanitization:

```bash
npm run test:unit
```

Tests are located in `tests/unit/sanitize.test.ts` and cover:
- Redaction of sensitive fields
- Partial masking of emails and addresses
- Nested object sanitization
- Recursion depth limits
- Array handling
- Case-insensitive field matching

## Troubleshooting

### Logs Not Appearing

1. Check `LOG_LEVEL` environment variable
2. Verify middleware is running on `/api/*` routes
3. Check that requests are actually hitting the API
4. Ensure stdout is not being redirected

### Sensitive Data Still Visible

1. Check field names match `SENSITIVE_FIELDS` (case-insensitive)
2. Verify sanitization is applied to response data
3. Add custom fields to `SENSITIVE_FIELDS` if needed
4. Check for nested sensitive fields

### Performance Impact

The logging system is designed to be lightweight:
- Minimal overhead for sanitization
- No blocking I/O operations
- Efficient JSON serialization
- Configurable log levels to reduce output

## Related Files

- `lib/logger.ts` - Main logging utilities
- `lib/sanitize.ts` - Sanitization logic
- `lib/requestId.ts` - Request ID generation
- `middleware.ts` - Middleware integration
- `tests/unit/sanitize.test.ts` - Test suite
