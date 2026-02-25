# Auth Middleware Implementation Summary

## What Was Created

### 1. Auth Middleware (`/lib/auth.ts`)
- `ApiError` class for structured error responses
- `getSession()` - retrieves session from cookies
- `requireAuth()` - throws 401 if no session
- `withAuth()` - wrapper for protecting route handlers

### 2. Public Routes
- `GET /api/health` - health check
- `POST /api/auth/nonce` - generate nonce for wallet signature
- `POST /api/auth/login` - authenticate and set session cookie
- `POST /api/auth/logout` - clear session

### 3. Protected Routes
All use `withAuth` wrapper and return 401 if unauthenticated:
- `GET /api/user/profile` - user profile
- `POST /api/split` - money split configuration
- `GET/POST /api/goals` - savings goals
- `GET/POST /api/bills` - bill payments
- `GET/POST /api/insurance` - insurance policies
- `GET/POST /api/family` - family members
- `POST /api/send` - send money

### 4. Documentation
- `/docs/API_ROUTES.md` - complete API documentation
- `/docs/TESTING_AUTH.md` - testing guide
- Updated `/README.md` with API routes section

## Usage Example

```typescript
import { withAuth } from '@/lib/auth';

async function handler(request: NextRequest, session: string) {
  // session is guaranteed to exist here
  return NextResponse.json({ data: 'protected' });
}

export const GET = withAuth(handler);
```

## Acceptance Criteria ✓

- [x] `withAuth` helper created and used in protected routes
- [x] Unauthenticated requests return 401 with error message
- [x] Public vs protected routes documented in `/docs/API_ROUTES.md`

## TODO (Future Implementation)
- Implement proper signature verification in login
- Store sessions in database instead of just cookie
- Add session expiration and refresh logic
- Add rate limiting
- Add CSRF protection
