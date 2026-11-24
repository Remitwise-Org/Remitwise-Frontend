# Idempotency Module

Provides idempotency key support for critical write endpoints to prevent duplicate operations from double-clicks or network retries.

## Quick Start

```typescript
import { withIdempotency } from '@/lib/idempotency';

export async function POST(request: NextRequest) {
  return withIdempotency(request, async (body) => {
    // Your logic here
    return NextResponse.json({ success: true });
  }, { required: true });
}
```

`Idempotency-Key` headers are optional by default and can be made required with
`{ required: true }`. A 24-hour TTL is used unless `ttlMs` is supplied.

Money-moving routes:
- `/api/send`
- `/api/remittance/build`
- `/api/v1/remittance/emergency/build`
- `/api/v1/anchor/deposit`
- `/api/v1/anchor/withdraw`

The browser API client generates an `Idempotency-Key` for POST, PUT, PATCH, and
DELETE requests. The key remains stable across session-refresh replay and other
retries for the same logical request. Callers may supply `idempotencyKey` in
`ApiClientOptions` to reuse a key explicitly.

## Files

- `types.ts` - TypeScript interfaces
- `store.ts` - In-memory cache (replace with Redis for production)
- `middleware.ts` - Request handling and caching logic
- `index.ts` - Module exports

## Features

- ✅ Automatic duplicate detection
- ✅ Request body hashing for conflict detection
- ✅ Configurable TTL (default 24 hours)
- ✅ Automatic cleanup of expired records
- ✅ 422 Conflict responses for mismatched bodies
- ✅ 409 Conflict responses for duplicate requests still in flight
- ✅ `X-Idempotent-Replay` header for cached responses

## Documentation

See `/docs/IDEMPOTENCY.md` for complete documentation including:
- Usage examples
- API specification
- Testing strategies
- Production migration guide
- OpenAPI schema
