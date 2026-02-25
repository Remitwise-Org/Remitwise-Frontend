# RemitWise Frontend

Frontend application for the RemitWise remittance and financial planning platform.

## Overview

This is a Next.js-based frontend skeleton that provides the UI structure for all RemitWise features. The application is built with:

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

## Features (Placeholders)

The frontend includes placeholder pages and components for:

1. **Dashboard** - Overview of remittances, savings, bills, and insurance
2. **Send Money** - Remittance sending interface with automatic split preview
3. **Smart Money Split** - Configuration for automatic allocation
4. **Savings Goals** - Goal-based savings tracking and management
5. **Bill Payments** - Bill tracking, scheduling, and payment
6. **Micro-Insurance** - Policy management and premium payments
7. **Family Wallets** - Family member management with roles and spending limits

## Getting Started

### Environment Configuration
The application requires connection to a Soroban RPC node.
- **Testnet:** `https://soroban-testnet.stellar.org` (Passphrase: `Test SDF Network ; September 2015`)
- **Mainnet:** `https://soroban-rpc.stellar.org` (Passphrase: `Public Global Stellar Network ; September 2015`)

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Setup Database
# 1. Ensure you have `.env` file with `DATABASE_URL="file:./dev.db"`
# 2. Run initial Prisma migration
npx prisma migrate dev

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Running lint and tests locally

CI runs the same commands on push/PR to `main` and `dev`. To run them locally:

```bash
# Lint
npm run lint

# Unit tests
npm run test
# or
npm run test:unit

# Integration tests (optional; uses .env.test or TEST_* env vars)
npm run test:integration
```

**Test environment:** Use a `.env.test` file in the project root (or set `TEST_*` env vars) for integration tests. Example variables:

- `TEST_SOROBAN_RPC_URL` – Soroban RPC endpoint (optional)
- `TEST_DATABASE_URL` – Database URL for integration tests (optional; skip if not required)

CI loads `.env.test` when present and can use `TEST_SOROBAN_RPC_URL` and `TEST_DATABASE_URL` from GitHub Secrets. The pipeline fails if lint or any test step fails.
### Authentication & Signature Verification

RemitWise implements a nonce-based challenge-response authentication mechanism to verify genuine wallet ownership over the Stellar network.

**Message Format and Verification Steps:**
1. **Request Nonce:** The frontend calls `GET /api/auth/nonce?address=<STELLAR_PUBLIC_KEY>` to receive a securely generated random 32-byte hex string (nonce). This nonce is temporarily cached on the server.
2. **Sign Nonce:** The client wallet (e.g., Freighter) is prompted to sign the raw nonce. The message to be signed is the byte representation of the hex nonce.
3. **Submit Signature:** The client submits `{"address": "...", "signature": "..."}` to `POST /api/auth/login`. The signature should be base64-encoded.
4. **Verification:** The backend converts the nonce to a Buffer and verifies the base64 signature against the supplied public address using `@stellar/stellar-sdk` (`Keypair.fromPublicKey(address).verify(nonceBuffer, signatureBuffer)`). Invalid signatures or missing/expired nonces will receive a `401 Unauthorized`.

### End-to-End Testing

To run the Playwright end-to-end tests for authentication and protected routes:

```bash
# Run tests
npm run test:e2e
```

## Project Structure

```
remitwise-frontend/
├── app/
│   ├── api/                 # API routes
│   ├── layout.tsx          # Root layout
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles
│   ├── dashboard/           # Dashboard page
│   ├── send/                # Send money page
│   ├── split/               # Money split configuration
│   ├── goals/               # Savings goals
│   ├── bills/               # Bill payments
│   ├── insurance/           # Insurance policies
│   └── family/              # Family wallets
├── components/              # Reusable components
├── lib/                     # Utilities and helpers
│   └── auth.ts              # Auth middleware
├── docs/                    # Documentation
│   └── API_ROUTES.md        # API routes documentation
├── public/                  # Static assets
└── package.json
```

## API Routes

See [API Routes Documentation](./docs/API_ROUTES.md) for details on authentication and available endpoints.

**Quick Reference:**
- Public routes: `/api/health`, `/api/auth/*`
- Protected routes: `/api/user/*`, `/api/split`, `/api/goals`, `/api/bills`, `/api/insurance`, `/api/family`, `/api/send`

## Integration Requirements

### Stellar SDK Integration

1. **Wallet Connection**
   - Integrate Freighter wallet or similar
   - Connect to Stellar network (testnet/mainnet)
   - Handle account authentication

2. **Smart Contract Integration**
   - Connect to deployed Soroban contracts
   - Implement contract function calls
   - Handle transaction signing and submission

3. **Anchor Platform Integration**
   - Integrate with anchor platform APIs for fiat on/off-ramps
   - Handle deposit/withdrawal flows
   - Process exchange rate quotes
   - **Environment Setup:** Set `ANCHOR_API_BASE_URL` in your `.env` file (see `.env.example`).
   - **Frontend API Endpoint:** Use `GET /api/anchor/rates` to fetch cached exchange rates with fallback support.

4. **Transaction Tracking**
   - Display on-chain transaction history
   - Show transaction status and confirmations
   - Implement real-time updates

### Key Integration Points

- **Send Money Page**: Connect to Stellar SDK for transaction creation and signing
- **Split Configuration**: Call `remittance_split` contract to initialize/update split
- **Savings Goals**: Integrate with `savings_goals` contract for goal management
- **Bills**: Connect to `bill_payments` contract for bill tracking
- **Insurance**: Integrate with `insurance` contract for policy management
- **Family Wallets**: Connect to `family_wallet` contract for member management

## Backend / API

### Overview

This Next.js application uses API routes to handle backend functionality. API routes are located in the `app/api/` directory and follow Next.js 14 App Router conventions.

**Key API Routes:**
- `/api/auth/*` - Authentication endpoints (wallet connect, nonce generation, signature verification)
- `/api/transactions/*` - Transaction history and status
- `/api/contracts/*` - Soroban smart contract interactions
- `/api/health` - Health check endpoint

All API routes are serverless functions deployed alongside the frontend.

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Stellar Network Configuration
NEXT_PUBLIC_STELLAR_NETWORK=testnet  # or 'mainnet'
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Contract IDs (deployed Soroban contracts)
NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID=
NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID=
NEXT_PUBLIC_BILL_PAYMENTS_CONTRACT_ID=
NEXT_PUBLIC_INSURANCE_CONTRACT_ID=
NEXT_PUBLIC_FAMILY_WALLET_CONTRACT_ID=

# Authentication
AUTH_SECRET=your-secret-key-here  # Generate with: openssl rand -base64 32
SESSION_COOKIE_NAME=remitwise-session
SESSION_MAX_AGE=86400  # 24 hours in seconds

# API Configuration
API_RATE_LIMIT=100  # requests per minute
API_TIMEOUT=30000  # milliseconds

# Optional: Anchor Platform
ANCHOR_PLATFORM_URL=
ANCHOR_PLATFORM_API_KEY=
```

See `.env.example` for a complete list of configuration options.

### Running the Backend

The backend API routes run automatically with the Next.js development server:

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

The API will be available at `http://localhost:3000/api/*`

### Authentication Flow

RemitWise uses wallet-based authentication with the following flow:

1. **Wallet Connect**: User connects their Stellar wallet (Freighter, Albedo, etc.)
   - Frontend detects wallet extension
   - User authorizes connection
   - Public key is retrieved

2. **Nonce Generation**: 
   - Client requests nonce from `/api/auth/nonce`
   - Server generates unique nonce and stores temporarily
   - Nonce returned to client

3. **Signature Verification**:
   - Client signs nonce with wallet private key
   - Signed message sent to `/api/auth/verify`
   - Server verifies signature matches public key
   - If valid, session token is created

4. **Session Management**:
   - JWT token stored in HTTP-only cookie
   - Token includes user's public key and expiration
   - Subsequent requests include token for authentication
   - Token validated on protected API routes

**Protected Routes**: All `/api/transactions/*`, `/api/contracts/*` endpoints require valid session.

### Contract IDs and Deployment

The application interacts with the following Soroban smart contracts on Stellar:

| Contract | Purpose | Environment Variable |
|----------|---------|---------------------|
| Remittance Split | Automatic money allocation | `NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID` |
| Savings Goals | Goal-based savings management | `NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID` |
| Bill Payments | Bill tracking and payments | `NEXT_PUBLIC_BILL_PAYMENTS_CONTRACT_ID` |
| Insurance | Micro-insurance policies | `NEXT_PUBLIC_INSURANCE_CONTRACT_ID` |
| Family Wallet | Family member management | `NEXT_PUBLIC_FAMILY_WALLET_CONTRACT_ID` |

**Deployment Notes:**
- Contracts must be deployed to Stellar testnet/mainnet before use
- Update contract IDs in `.env.local` after deployment
- Verify contract addresses match network (testnet vs mainnet)
- Contract ABIs are included in `lib/contracts/` directory

### Health and Monitoring

**Health Check Endpoint**: `GET /api/health`

Returns system status and connectivity:

```json
{
  "status": "healthy",
  "timestamp": "2024-02-24T10:30:00Z",
  "services": {
    "stellar": "connected",
    "contracts": "available",
    "database": "connected"
  },
  "version": "0.1.0"
}
```

**Monitoring Recommendations:**
- Set up uptime monitoring for `/api/health`
- Monitor API response times and error rates
- Track Stellar network connectivity
- Log contract interaction failures
- Set alerts for authentication failures

### Testing

**Unit Tests**

Test individual API route handlers and utility functions:

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Unit tests are located alongside source files with `.test.ts` extension.

**Integration Tests**

Test complete API flows including authentication and contract interactions:

```bash
# Run integration tests
npm run test:integration

# Test specific API route
npm run test:integration -- auth
```

Integration tests are in the `__tests__/integration/` directory.

**Testing Checklist:**
- ✓ Authentication flow (nonce → sign → verify)
- ✓ Contract interactions (all 5 contracts)
- ✓ Error handling and validation
- ✓ Rate limiting
- ✓ Session management

### API Documentation

For detailed API specifications:

- **OpenAPI Spec**: See `openapi.yaml` for complete API documentation
- **Interactive Docs**: Run `npm run docs` to view Swagger UI at `http://localhost:3000/api-docs`
- **Postman Collection**: Import `postman_collection.json` for testing

**Quick API Reference:**

```bash
# Authentication
POST /api/auth/nonce          # Get nonce for signing
POST /api/auth/verify         # Verify signature and create session
POST /api/auth/logout         # End session

# Transactions
GET  /api/transactions        # List user transactions
GET  /api/transactions/:id    # Get transaction details

# Contracts
POST /api/contracts/split     # Initialize/update split configuration
POST /api/contracts/goals     # Create/manage savings goals
POST /api/contracts/bills     # Manage bill payments
POST /api/contracts/insurance # Manage insurance policies
POST /api/contracts/family    # Manage family wallet

# System
GET  /api/health              # Health check
```

## Design Notes

- All forms are currently disabled (placeholders)
- UI uses a blue/indigo color scheme
- Responsive design with mobile-first approach
- Components are structured for easy integration

## Future Enhancements

- Real-time transaction updates
- Push notifications for bill reminders
- Charts and graphs for financial insights
- Multi-language support
- Dark mode
- Mobile app (React Native)

## License

MIT

**API Versioning**

- **Approach (decided):** URL prefix versioning using `/api/v{n}/...` (e.g. `/api/v1/...`). This is simple to route, cache, and reason about in the frontend and server layers.
- **Current status:** The existing API surface in this repository is labeled as **v1**. To avoid breaking existing clients, the app rewrites `/api/*` to `/api/v1/*` at the Next.js layer so existing clients can continue using `/api/...` without changes.
- **Routes:** When adding new server routes, prefer placing them under `app/api/v1/` (or `pages/api/v1/` if using pages router) so they are clearly versioned. Optionally duplicate stable v1 routes under the `v1` namespace during a migration window rather than deleting the legacy route immediately.
- **How to introduce v2:** Create a new `app/api/v2/` namespace containing the new behavior. Update platform routes or API gateway rules to expose `/api/v2/...` and leave the rewrite in place so `/api/*` stays mapped to the last published stable version (v1) until you intentionally change it.

**Deprecation Policy**

- When a new major version (e.g. v2) is released, older major versions will be supported for a minimum of **6 months** before scheduled removal. During that window:
   - Maintain security fixes and critical bug fixes for the deprecated major version.
   - Announce deprecation clearly in changelogs and developer docs with migration guides.
   - Provide automated redirects or compatibility layers where feasible.

**OpenAPI / API Documentation**

- This repository contains an OpenAPI descriptor for the current v1 API at `openapi.yaml` (root). The `servers` entry points to the `/api/v1` base path. Update `openapi.yaml` as you add endpoints.

**Rate Limiting**

- All `/api/*` routes are protected by a global rate limiter using in-memory `lru-cache`.
- **Limits (per IP/session):**
  - **Auth endpoints (`/api/auth/*`)**: 10 requests per minute
  - **Write endpoints (`POST`, `PUT`, `DELETE`, `PATCH`)**: 50 requests per minute
  - **General read endpoints (`GET`)**: 100 requests per minute
- **Whitelisted routes**: `/api/health` is exempt from rate limiting to ensure uptime monitoring is not blocked.
- **Behavior**: When a limit is exceeded, the server responds with a `429 Too Many Requests` status code and a `Retry-After` header indicating the number of seconds until the rate limit resets. Rate limit information is also provided in the response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

**Non-breaking guarantee**

- To meet the repository's backward-compatibility requirement, we keep `/api/*` behavior unchanged by rewriting it to `/api/v1/*`. This preserves compatibility for existing consumers.

If you want, I can also:
- Move or duplicate any existing API route files into an explicit `app/api/v1/` folder.
- Expand `openapi.yaml` with concrete endpoint definitions from your backend contract or tests.

API Endpoints (v1)

- `POST /api/bills` — Create bill transaction XDR
   - Request headers: `x-user` (caller public key)
   - Body: `{ name, amount, dueDate, recurring, frequencyDays }`
   - Validations: `amount > 0`, `dueDate` valid ISO date, when `recurring === true` then `frequencyDays > 0`.
   - Response: `{ xdr: string }` — unsigned transaction XDR ready for the frontend to sign and submit.

- `POST /api/bills/[id]/pay` — Build pay-bill transaction XDR
   - Request headers: `x-user` (caller public key)
   - Response: `{ xdr: string }`

- `POST /api/bills/[id]/cancel` — Build cancel-bill transaction XDR
   - Request headers: `x-user` (caller public key)
   - Optional owner-only enforcement: set header `x-owner-only: 1` and `x-owner` to require the caller match the owner.
   - Response: `{ xdr: string }`

Notes:
- These endpoints return a transaction XDR composed of `manageData` operations that encode the requested action. The frontend should sign the returned XDR and submit it to Horizon (or via a backend submission endpoint) to complete the operation.
- Server builds transactions using the Horizon URL in `HORIZON_URL` and network passphrase in `NETWORK_PASSPHRASE` (defaults to testnet). Set these environment variables in production to use a different network.

Insurance endpoints (v1)

- `POST /api/insurance` — Create policy transaction XDR
   - Request headers: `x-user` (caller public key)
   - Body: `{ name, coverageType, monthlyPremium, coverageAmount }`
   - Validations: `monthlyPremium > 0`, `coverageAmount > 0`, required `name` and `coverageType`.
   - Response: `{ xdr: string }` — unsigned transaction XDR ready for the frontend to sign and submit.

- `POST /api/insurance/[id]/pay` — Build pay-premium transaction XDR
   - Request headers: `x-user` (caller public key)
   - Response: `{ xdr: string }`

- `POST /api/insurance/[id]/deactivate` — Build deactivate-policy transaction XDR
   - Request headers: `x-user` (caller public key)
   - Optional owner-only enforcement: set header `x-owner-only: 1` and `x-owner` to require the caller match the owner.
   - Response: `{ xdr: string }`

Notes:
- These endpoints return transaction XDRs composed with `manageData` operations to encode policy actions. If you prefer Soroban contract invocations, I can convert the builders to use contract calls.

