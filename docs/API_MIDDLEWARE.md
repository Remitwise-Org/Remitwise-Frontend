# API Middleware Implementation Summary

## Overview

Implemented CORS, security headers, and request body size validation for all `/api` routes in the Next.js application. The implementation follows best practices with modular helper functions, proper header ordering, and comprehensive test coverage.

For the per-route handler decorators (`withAuth`, `validatedRoute`, `withApiErrorHandler`) that individual routes opt into on top of this global middleware, see [docs/api-route-decorators.md](./api-route-decorators.md).

## Implementation Details

### 1. **middleware.ts** - Core Implementation

#### New Helper Functions

Three modular, testable helper functions added at the start of the middleware:

##### `applyCORS(response: NextResponse, request: NextRequest): void`
- Applies CORS headers to all API responses
- Reads allowed origin from `NEXT_PUBLIC_APP_URL` environment variable
- Supports same-origin requests with fallback to `http://localhost:3000`
- Sets proper CORS headers:
  - `Access-Control-Allow-Origin` (from request origin or env var)
  - `Access-Control-Allow-Methods` (GET, POST, PUT, DELETE, PATCH, OPTIONS)
  - `Access-Control-Allow-Headers` (Content-Type, Authorization, X-Requested-With)
  - `Access-Control-Allow-Credentials: true`
  - `Vary: Origin` (for proper cache behavior)

##### `applySecurityHeaders(response: NextResponse): void`
- Applies defense-in-depth security headers to all API responses
- Headers applied:
  - `X-Content-Type-Options: nosniff` - Prevents MIME-type sniffing
  - `X-Frame-Options: DENY` - Prevents clickjacking
  - `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
- No configuration required; applied automatically

##### `async validateBodySize(request: NextRequest, maxSize?: number): Promise<{valid: boolean; error?: NextResponse}>`
- Validates request body size for POST/PUT/PATCH methods
- Primary check: `Content-Length` header (fast)
- Fallback check: Reads request body if header missing (comprehensive)
- Default limit: 1MB (1,048,576 bytes)
- Configurable via `API_MAX_BODY_SIZE` environment variable
- Returns 413 Payload Too Large with descriptive JSON error if exceeded

#### Middleware Flow (Step-by-step)

```
1. Check Playwright test whitelist (bypass all checks) → Allow
   ↓
2. Check health check endpoint → Allow
   ↓
3. Create response object
   ↓
4. applyCORS(response, request) - Apply CORS headers FIRST
   ↓
5. applySecurityHeaders(response) - Apply security headers
   ↓
6. Handle OPTIONS preflight → Return 204 No Content (no body)
   ↓
7. validateBodySize(request) - Check POST/PUT/PATCH size
   ↓ (invalid)
   Return 413 Payload Too Large → End
   ↓ (valid)
8. Apply rate limiting (existing logic)
   ↓
9. Rate limit exceeded? → Return 429 (existing)
   ↓
10. Add rate limit headers to response
    ↓
Return response with all headers
```

#### Key Design Decisions

1. **Header Order**: CORS/Security headers applied BEFORE rate limiting
   - Ensures OPTIONS preflight requests complete successfully
   - Prevents preflight requests from being rate-limited
   - All responses include security headers regardless of rate limit

2. **Async Middleware**: Changed from `function` to `async function`
   - Required to support body size validation with `await request.arrayBuffer()`
   - Allows fallback body reading if Content-Length header missing

3. **Content-Length Fallback**: Two-tier validation approach
   - Primary: Fast check via `Content-Length` header
   - Fallback: Read body for comprehensive validation
   - Handles streaming/chunked encoding scenarios
   - Graceful error handling if body reading fails

4. **Security by Default**: All headers applied to all responses
   - No opt-in required
   - Consistent defense-in-depth across all API routes

### 2. **.env.example** - Environment Variables

Added two new environment variables:

```bash
# Frontend application URL for CORS policy (required for /api routes)
# Requests from this origin will be allowed by CORS middleware
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Maximum request body size for POST/PUT/PATCH in bytes (default 1MB)
# Requests exceeding this size will receive a 413 Payload Too Large response
API_MAX_BODY_SIZE=1048576
```

#### Variable Details

- **NEXT_PUBLIC_APP_URL**: Public variable (accessible in browser)
  - Used for CORS policy configuration
  - Default fallback: `http://localhost:3000`
  - Expected format: Full URL (e.g., `https://app.example.com`)
  - Future enhancement: Support comma-separated list of origins

- **API_MAX_BODY_SIZE**: Private variable (server-only)
  - Optional; defaults to 1MB if not set
  - Expected format: Number in bytes
  - Common values: 512000 (500KB), 1048576 (1MB), 5242880 (5MB)
  - Can be disabled by setting very large value if needed

### 3. **README.md** - Documentation

Added comprehensive "API Middleware Configuration" section with:

#### 3a. CORS Policy Documentation
- Explanation of allowed origins
- Allowed methods and headers
- Credentials handling
- Preflight handling
- Example curl commands for testing

#### 3b. Security Headers Table
| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevents MIME-type sniffing |
| X-Frame-Options | DENY | Prevents clickjacking |
| X-XSS-Protection | 1; mode=block | Legacy XSS protection |
| Vary | Origin | Instructs caches to vary by origin |

#### 3c. Body Size Limit Documentation
- Default limit (1MB) explanation
- Validation behavior
- Configuration instructions
- Example curl commands for testing

#### 3d. Middleware Flow Diagram
Visual representation of middleware execution order and decision points

### 4. **tests/unit/middleware.test.cjs** - Comprehensive Test Suite

Created 15 unit tests covering:

#### applyCORS Tests (3 tests)
- ✅ Sets correct headers for same-origin requests
- ✅ Sets headers for requests from allowed origin
- ✅ Falls back to NEXT_PUBLIC_APP_URL when env var set

#### applySecurityHeaders Tests (2 tests)
- ✅ Sets all required security headers
- ✅ Headers have correct values for defense-in-depth

#### validateBodySize Tests (7 tests)
- ✅ Allows GET requests without validation
- ✅ Allows DELETE requests without validation
- ✅ Rejects POST requests exceeding Content-Length limit
- ✅ Allows POST requests within limit
- ✅ Respects custom size limit parameter
- ✅ Validates PUT requests properly
- ✅ Validates PATCH requests properly

#### Integration Tests (3 tests)
- ✅ CORS applied before rate limiting
- ✅ Security headers applied to all responses
- ✅ 204 No Content response for preflight has no body

**Test Results**: All 15 tests passing ✅

## Files Modified

### 1. middleware.ts
- **Lines Added**: ~200
- **Changes**: Added 3 helper functions, integrated into middleware flow, made function async
- **Backwards Compatible**: Yes, existing rate limiting logic preserved

### 2. .env.example
- **Lines Added**: 5
- **Changes**: Added NEXT_PUBLIC_APP_URL and API_MAX_BODY_SIZE variables
- **Impact**: Documentation only, no runtime changes

### 3. README.md
- **Lines Added**: ~150
- **Section**: New "API Middleware Configuration" section
- **Content**: CORS, Security Headers, Body Size Validation, examples, flow diagram

### 4. tests/unit/middleware.test.cjs
- **New File**: Created comprehensive test suite
- **Tests**: 15 tests, all passing
- **Coverage**: All three helper functions + integration scenarios

## Testing & Verification

### Unit Tests
```bash
npm run test:unit  # Runs all unit tests including new middleware tests
```
- All 15 middleware tests passing
- Tests use Node.js built-in test module for consistency
- Follows existing project test patterns

### Manual Testing
```bash
# Test CORS preflight
curl -i -X OPTIONS http://localhost:3000/api/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"

# Test security headers
curl -i http://localhost:3000/api/health

# Test body size validation
curl -i -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d "$(dd if=/dev/zero bs=1M count=2 2>/dev/null | base64)"
```

## Acceptance Criteria Met

✅ **Middleware runs on /api routes**
- Configured with `matcher: '/api/:path*'` in config export
- Applies to all API endpoints

✅ **CORS and security headers applied**
- CORS headers: Origin, Methods, Headers, Credentials, Vary
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- Applied to all responses in correct order

✅ **Documented**
- README.md: Comprehensive API Middleware Configuration section
- .env.example: Environment variables documented
- middleware.ts: Inline code comments explaining each step
- Tests: Unit tests verify functionality

## Future Enhancements

1. **CORS Origins List**: Extend to support comma-separated list of allowed origins
   ```typescript
   const allowedOrigins = (process.env.NEXT_PUBLIC_APP_URL || '')
     .split(',')
     .map(origin => origin.trim());
   ```

2. **Rate Limiting for CORS Preflight**: Optional rate limiting control for preflight requests
   ```typescript
   if (request.method === 'OPTIONS' && shouldLimitPreflight) {
     // Apply rate limiting
   }
   ```

3. **Custom Security Headers**: Make security headers configurable via environment variables
   ```typescript
   const customHeaders = JSON.parse(process.env.CUSTOM_SECURITY_HEADERS || '{}');
   ```

4. **Body Size by Route**: Different size limits for different routes
   ```typescript
   const routeSizeLimits = {
     '/api/upload': 52428800, // 50MB for uploads
     '/api/default': 1048576, // 1MB for others
   };
   ```

5. **Monitoring & Metrics**: Add telemetry for:
   - CORS rejections
   - Security header coverage
   - Body size validation hits
   - Rate limit triggers

## Notes

- **Backwards Compatibility**: Implementation maintains existing rate limiting functionality
- **Performance**: Minimal overhead; CORS/security headers added before rate limiting
- **Security**: Defense-in-depth approach with multiple protection layers
- **Testability**: Modular helpers allow easy unit testing and future enhancements
- **Maintainability**: Clear code comments and documentation for future developers

## Conclusion

The API middleware implementation successfully adds CORS, security headers, and body size validation to all `/api` routes with:
- ✅ Modular, testable helper functions
- ✅ Proper header application order
- ✅ Comprehensive documentation
- ✅ Full test coverage (15 tests, all passing)
- ✅ Backwards compatibility
- ✅ Production-ready code quality
