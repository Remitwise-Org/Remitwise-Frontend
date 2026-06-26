# Remittance Split Transaction Builder

## Overview

This feature provides backend services for building unsigned Soroban transactions for remittance split configuration. The system maintains user custody by only building transactions - users sign with their own wallets.

## Features

- ✅ Build unsigned transactions for split initialization
- ✅ Build unsigned transactions for split updates
- ✅ Percentage validation (must sum to 100)
- ✅ Session-based authentication
- ✅ Transaction simulation for cost estimation
- ✅ Optional custodial mode support
- ✅ Comprehensive error handling

## Send Flow Integration

The `POST /api/send` flow in `app/send/page.tsx` uses `computeAllocation()` from
`lib/remittance/split.ts` to compute the split breakdown **client-side** after a
successful API response:

```typescript
// app/send/page.tsx – handleConfirm (simplified)
const data = await response.json();          // { success, transactionId }
const splits = computeAllocation(amount, getSplitConfig(recipient));
// → { spending, savings, bills, insurance }  (sums exactly to amount)

// Feed into TransactionSuccessReceipt:
<TransactionSuccessReceipt
  hash={data.transactionId}
  splits={splits}           // ← real allocation, not inline amount * 0.5 math
  ...
/>
```

**Why client-side?** The `/api/send` endpoint returns `{ success, transactionId }` —
a "build transaction" stub. Keeping split math in `computeAllocation()` means:

- The allocation is consistent between the Send page and the Split settings page.
- `computeAllocation()` guarantees integer rounding with no float drift (spending
  bucket absorbs the remainder).
- When the backend eventually returns fee/exchange-rate adjustments, only
  `getSplitConfig()` needs updating.

See `lib/remittance/split.ts` for the full API.



## Architecture

```
Frontend → API Routes → Transaction Builder → Unsigned XDR
   ↓
User Wallet (Sign) → Stellar Network (Submit)
```

## API Endpoints

### POST /api/split/initialize

Initialize a new remittance split configuration.

**Request:**
```json
{
  "spending": 40,
  "savings": 30,
  "bills": 20,
  "insurance": 10
}
```

**Response:**
```json
{
  "success": true,
  "xdr": "AAAAAgAAAAC...",
  "simulate": {
    "cost": "1000000",
    "results": []
  },
  "message": "Transaction built successfully..."
}
```

### POST /api/split/update

Update an existing remittance split configuration.

**Request:**
```json
{
  "spending": 50,
  "savings": 25,
  "bills": 15,
  "insurance": 10
}
```

**Response:**
```json
{
  "success": true,
  "xdr": "AAAAAgAAAAC...",
  "simulate": {
    "cost": "1000000",
    "results": []
  },
  "message": "Transaction built successfully..."
}
```

## Setup

### 1. Install Dependencies

Dependencies are already included in package.json:
- `@stellar/stellar-sdk` - Stellar SDK for transaction building

### 2. Configure Environment

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `STELLAR_NETWORK` - Network to use (testnet/mainnet)
- `STELLAR_NETWORK_PASSPHRASE` - Network passphrase
- `STELLAR_HORIZON_URL` - Horizon server URL
- `REMITTANCE_SPLIT_CONTRACT_ID` - Deployed contract ID

Optional (for custodial mode):
- `SERVER_SECRET_KEY` - Server signing key
- `CUSTODIAL_MODE` - Enable server signing

### 3. Deploy Contract

Before using this feature, deploy the remittance split Soroban contract and set the contract ID in your environment variables.

## Usage

See [docs/TRANSACTION_INTEGRATION.md](docs/TRANSACTION_INTEGRATION.md) for complete frontend integration guide.

### Quick Example

```typescript
// 1. Build transaction
const response = await fetch('/api/split/initialize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    spending: 40,
    savings: 30,
    bills: 20,
    insurance: 10
  })
});

const { xdr } = await response.json();

// 2. Sign with wallet
const signedXdr = await window.freighter.signTransaction(xdr);

// 3. Submit to network
const result = await server.sendTransaction(signedXdr);
```

## Validation Rules

1. **Percentages must sum to 100**: All four percentages (spending, savings, bills, insurance) must sum to exactly 100
2. **Non-negative values**: All percentages must be >= 0
3. **Required fields**: All four percentage fields are required
4. **Valid address**: Caller address must be a valid Stellar address (G...)

## Error Handling

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation Error | Invalid percentages or missing fields |
| 401 | Unauthorized | Missing or invalid authentication |
| 500 | Server Error | Transaction building failed |
| 503 | Network Error | Unable to connect to Stellar network |

## Security

- ✅ Session-based authentication required
- ✅ Input validation on all requests
- ✅ User maintains custody (non-custodial by default)
- ✅ Optional custodial mode for specific use cases
- ✅ Structured error messages without sensitive data

## Testing

### Manual Testing

1. Create a test session token:
```typescript
import { createSessionToken } from '@/lib/auth/session';
const token = createSessionToken('GXXXXX...', 'GXXXXX...');
```

2. Test initialize endpoint:
```bash
curl -X POST http://localhost:3000/api/split/initialize \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"spending":40,"savings":30,"bills":20,"insurance":10}'
```

3. Test update endpoint:
```bash
curl -X POST http://localhost:3000/api/split/update \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"spending":50,"savings":25,"bills":15,"insurance":10}'
```

## Project Structure

```
lib/
├── auth/
│   └── session.ts              # Session management
├── config/
│   └── stellar.ts              # Stellar configuration
├── contracts/
│   └── remittance-split.ts     # Transaction builders
├── types/
│   └── api.ts                  # API types and errors
├── utils/
│   └── error-handler.ts        # Error handling utilities
└── validation/
    └── percentages.ts          # Validation logic

app/api/split/
├── initialize/
│   └── route.ts                # Initialize endpoint
└── update/
    └── route.ts                # Update endpoint

docs/
└── TRANSACTION_INTEGRATION.md  # Frontend integration guide
```

## Implementation Details

### Transaction Building

Transactions are built using the Stellar SDK:
1. Load source account from network
2. Create contract invocation operation
3. Build transaction with appropriate fees
4. Optionally simulate for cost estimation
5. Return unsigned XDR (or signed if custodial mode)

### Session Management

Simple token-based authentication for development:
- Tokens are base64-encoded JSON with address and publicKey
- Production should use proper JWT with signing/verification
- Sessions extracted from Authorization header

### Validation

Multi-layer validation:
1. API layer: Request format and authentication
2. Validation layer: Percentage rules and address format
3. Transaction builder: Stellar SDK validation

## Future Enhancements

- [ ] Batch transaction building
- [ ] Transaction templates
- [ ] Advanced fee estimation
- [ ] Transaction caching
- [ ] Webhook notifications
- [ ] Multi-signature support
- [ ] Transaction history

## Contributing

When making changes:
1. Update validation logic in `lib/validation/`
2. Update transaction builders in `lib/contracts/`
3. Update API routes in `app/api/split/`
4. Update documentation in `docs/`
5. Test with both valid and invalid inputs

## License

MIT

## Issue #772 Fix
Documentation updated per issue requirements.

## Issue #771 Fix
Documentation updated per issue requirements.
