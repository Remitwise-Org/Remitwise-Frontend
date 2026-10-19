# Idempotency Module

Provides idempotency key support for critical write endpoints to prevent duplicate operations from double-clicks or network retries.

## Quick Start

```typescript
import { withIdempotency } from '@/lib/idempotency';

export async function POST(request: NextRequest) {
  return withIdempotency(request, async (body) => {
    // Your logic here
    return NextResponse.json({ success: true });
  });
}
```

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
- ✅ 409 Conflict responses for mismatched bodies
- ✅ `X-Idempotent-Replay` header for cached responses

## Documentation

See `/docs/IDEMPOTENCY.md` for complete documentation including:
- Usage examples
- API specification
- Testing strategies
- Production migration guide
- OpenAPI schema
