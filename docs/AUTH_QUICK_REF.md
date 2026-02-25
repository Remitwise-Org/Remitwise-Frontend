# Auth Middleware Quick Reference

## Protect a Route

```typescript
import { withAuth } from '@/lib/auth';

async function handler(request: NextRequest, session: string) {
  // Your logic - session guaranteed to exist
  return NextResponse.json({ data: 'success' });
}

export const GET = withAuth(handler);
export const POST = withAuth(handler);
```

## Public Routes
- `/api/health`
- `/api/auth/nonce`
- `/api/auth/login`
- `/api/auth/logout`

## Protected Routes
- `/api/user/profile`
- `/api/split`
- `/api/goals`
- `/api/bills`
- `/api/insurance`
- `/api/family`
- `/api/send`

## Error Response (401)
```json
{
  "error": "Unauthorized"
}
```

## Session Flow
1. POST `/api/auth/nonce` → get nonce
2. Sign nonce with wallet
3. POST `/api/auth/login` → set session cookie
4. Access protected routes (cookie auto-sent)
5. POST `/api/auth/logout` → clear session
