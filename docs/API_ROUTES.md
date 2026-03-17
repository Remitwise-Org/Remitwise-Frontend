# API Routes Documentation

## Folder Structure

All API route handlers live under `app/api/` following Next.js 14 App Router conventions.

```
app/api/
├── health/
│   └── route.ts              # GET /api/health — public health check
├── auth/
│   ├── nonce/
│   │   └── route.ts          # POST /api/auth/nonce
│   ├── login/
│   │   └── route.ts          # POST /api/auth/login
│   └── logout/
│       └── route.ts          # POST /api/auth/logout
├── user/
│   └── profile/
│       └── route.ts          # GET /api/user/profile
├── split/
│   ├── route.ts              # GET, POST /api/split
│   └── calculate/
│       └── route.ts          # GET /api/split/calculate
├── goals/
│   └── route.ts              # GET, POST /api/goals
├── bills/
│   └── route.ts              # GET, POST /api/bills
├── insurance/
│   └── route.ts              # GET, POST /api/insurance
├── family/
│   └── route.ts              # GET, POST /api/family
├── send/
│   └── route.ts              # POST /api/send
├── remittance/
│   └── route.ts              # Remittance endpoints
├── anchor/
│   └── route.ts              # Anchor platform integration
└── webhooks/
    └── route.ts              # Webhook handlers
```

### Naming Convention

```
app/api/[domain]/[action]/route.ts
```

- **domain** — the feature area (e.g. `split`, `goals`, `bills`)
- **action** — optional sub-action (e.g. `calculate`, `pay`, `cancel`)
- **route.ts** — exports named functions: `GET`, `POST`, `PUT`, `DELETE`

### How to Call an Endpoint

```bash
# Health check (public)
curl http://localhost:3000/api/health

# Protected route (requires session cookie)
curl http://localhost:3000/api/split \
  -H "Cookie: remitwise-session=<your-session-token>"
```

### How to Add a New Route

1. Create the folder: `app/api/[domain]/[action]/`
2. Create `route.ts` inside it
3. Export the HTTP methods you need:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ data: "example" }, { status: 200 });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ received: body }, { status: 201 });
}
```

4. If the route is protected, wrap with `withAuth` (see Authentication section below).

---

## Authentication

All API routes use cookie-based session authentication. The session cookie is set after successful login and verified on protected routes.

### Auth Middleware

The `withAuth` helper in `/lib/auth.ts` protects routes by:
1. Checking for a valid session cookie
2. Returning 401 if no session exists
3. Passing the session to the route handler

Usage:
```typescript
import { withAuth } from '@/lib/auth';

async function handler(request: NextRequest, session: string) {
  // Your logic here - session is guaranteed to exist
  return NextResponse.json({ data: 'protected' });
}

export const GET = withAuth(handler);
```

---

## Route Classification

### Public Routes (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/nonce` | Generate nonce for wallet signature |
| POST | `/api/auth/login` | Login with signed nonce |
| POST | `/api/auth/logout` | Clear session |

### Protected Routes (Authentication Required)

All protected routes return `401 Unauthorized` if no valid session exists.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| GET | `/api/split` | Get current split configuration |
| GET | `/api/split/calculate?amount=100` | Calculate split amounts for given amount |
| POST | `/api/split` | Configure money split |
| GET | `/api/goals` | List savings goals |
| POST | `/api/goals` | Create savings goal |
| GET | `/api/bills` | List bills |
| POST | `/api/bills` | Create/pay bill |
| GET | `/api/insurance` | List insurance policies |
| POST | `/api/insurance` | Create insurance policy |
| GET | `/api/family` | List family members |
| POST | `/api/family` | Add family member |
| POST | `/api/send` | Send money transaction |
| POST | `/api/anchor/deposit` | Start anchor deposit flow (fiat -> USDC) |
| POST | `/api/anchor/withdraw` | Start anchor withdrawal flow (USDC -> fiat) |

### Admin/Internal Routes

All `/api/admin/*` routes require admin authentication and return `401` when unauthorized.

Authentication:
- Header: `X-Admin-Key: <ADMIN_SECRET>`
- Cookie: `admin_key=<ADMIN_SECRET>` (or `admin_secret=<ADMIN_SECRET>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/cache/clear` | Clear in-memory caches |
| GET | `/api/admin/users?limit=20` | List recent users (support/ops) |
| GET | `/api/admin/audit?limit=50` | List latest audit events |

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Authentication Flow

1. **Request Nonce**: `POST /api/auth/nonce` with `{ publicKey }`
2. **Sign Nonce**: User signs nonce with wallet
3. **Login**: `POST /api/auth/login` with `{ publicKey, signature }`
4. **Session Cookie**: Server sets httpOnly session cookie
5. **Protected Requests**: Cookie automatically sent with requests
6. **Logout**: `POST /api/auth/logout` clears session

---

## Implementation Notes

- Session stored as httpOnly cookie for security
- Session value currently stores publicKey (TODO: use proper session ID)
- All protected routes use `withAuth` wrapper
- Signature verification not yet implemented (TODO)
- Session storage in database not yet implemented (TODO)

---

## Contract Integration

### Environment Variables

The following environment variables must be configured:

- `STELLAR_NETWORK`: Network to use (`testnet` or `mainnet`, defaults to `testnet`)
- `REMITTANCE_SPLIT_CONTRACT_ID`: Deployed remittance split contract address
- `ANCHOR_API_BASE_URL`: Base URL for anchor API
- `ANCHOR_API_KEY`: Optional bearer token for anchor API
- `ANCHOR_DEPOSIT_PATH`: Deposit interactive endpoint path
- `ANCHOR_WITHDRAW_PATH`: Withdraw interactive endpoint path
- `ADMIN_SECRET`: Shared secret for `/api/admin/*` authorization
- `SHUTDOWN_TIMEOUT_MS`: Graceful shutdown timeout for in-process jobs

Anchor routes return `501 Not Implemented` when `ANCHOR_API_BASE_URL` is not configured.

**Important**: The remittance_split contract must be deployed on the specified network before the split API endpoints will work.

### Split API Responses

**GET /api/split**
```json
{
  "percentages": {
    "savings": 30,
    "bills": 25,
    "insurance": 10,
    "family": 20
  }
}
```

**GET /api/split/calculate?amount=1000**
```json
{
  "amounts": {
    "savings": "300",
    "bills": "250",
    "insurance": "100",
    "family": "200",
    "remainder": "150"
  }
}
```

### Error Handling

- `404 Not Found`: Contract not deployed or split not configured
- `500 Internal Server Error`: RPC connection error or contract read failure
- `400 Bad Request`: Invalid parameters (calculate endpoint)
```

---
