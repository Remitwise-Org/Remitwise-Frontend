# Remittance Build API

## Overview

The `/api/remittance/build` endpoint builds unsigned Stellar transactions for sending remittances (USDC or XLM transfers). The frontend receives the transaction XDR, signs it with the user's wallet, and submits it to the Stellar network.

## Endpoint

```
POST /api/remittance/build
```

**Authentication:** Required (session cookie)

## Request Body

```typescript
{
  amount: number;           // Amount to send (positive number, e.g., 100.50)
  currency?: string;        // "USDC" (default) or "XLM"
  recipientAddress: string; // Stellar public key (G... format)
  memo?: string;           // Optional memo (max 28 characters)
}
```

### Validation Rules

- `amount`: Must be a positive number greater than 0
- `recipientAddress`: Must be a valid Stellar public key (starts with G, 56 characters)
- `currency`: Optional, defaults to "USDC". Accepts "USDC" or "XLM"
- `memo`: Optional, max 28 characters

## Response

### Success Response (200)

```typescript
{
  success: true;
  data: {
    xdr: string;              // Unsigned transaction XDR
    networkPassphrase: string; // Network passphrase for signing
    simulate: {
      fee: string;            // Estimated transaction fee
      success: boolean;       // Simulation result
    };
  };
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Not authenticated"
  }
}
```

#### 400 Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount is required and must be a positive number"
  }
}
```

Common validation error messages:
- `"amount is required and must be a positive number"`
- `"recipientAddress must be a valid Stellar public key (G...)"`
- `"currency must be either XLM or USDC"`
- `"memo must be 28 characters or less"`
- `"Insufficient balance to complete this transaction"`
- `"Invalid or non-existent recipient address"`

#### 502 Contract Error
```json
{
  "success": false,
  "error": {
    "code": "CONTRACT_ERROR",
    "message": "Failed to build transaction: ..."
  }
}
```

## Frontend Integration Flow

### 1. Build Transaction

```typescript
async function buildRemittance(
  amount: number,
  recipientAddress: string,
  currency: 'USDC' | 'XLM' = 'USDC',
  memo?: string
) {
  const response = await fetch('/api/remittance/build', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include session cookie
    body: JSON.stringify({
      amount,
      recipientAddress,
      currency,
      memo,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const result = await response.json();
  return result.data; // { xdr, networkPassphrase, simulate }
}
```

### 2. Sign with Wallet

```typescript
import { Transaction } from '@stellar/stellar-sdk';

async function signTransaction(xdr: string, networkPassphrase: string) {
  // Using Freighter wallet as example
  const { signTransaction } = await import('@stellar/freighter-api');
  
  const signedXdr = await signTransaction(xdr, {
    networkPassphrase,
  });

  return signedXdr;
}
```

### 3. Submit to Network

```typescript
import { Server, Transaction } from '@stellar/stellar-sdk';

async function submitTransaction(signedXdr: string, networkPassphrase: string) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const transaction = Transaction.fromXDR(signedXdr, networkPassphrase);
  
  try {
    const result = await server.submitTransaction(transaction);
    return {
      success: true,
      hash: result.hash,
      ledger: result.ledger,
    };
  } catch (error) {
    console.error('Transaction submission failed:', error);
    throw error;
  }
}
```

### 4. Complete Flow Example

```typescript
async function sendRemittance(
  amount: number,
  recipientAddress: string,
  currency: 'USDC' | 'XLM' = 'USDC',
  memo?: string
) {
  try {
    // Step 1: Build transaction
    const { xdr, networkPassphrase, simulate } = await buildRemittance(
      amount,
      recipientAddress,
      currency,
      memo
    );

    console.log('Transaction built successfully');
    console.log('Estimated fee:', simulate.fee);

    // Step 2: Sign with user's wallet
    const signedXdr = await signTransaction(xdr, networkPassphrase);

    // Step 3: Submit to Stellar network
    const result = await submitTransaction(signedXdr, networkPassphrase);

    console.log('Transaction submitted:', result.hash);
    return result;

  } catch (error) {
    console.error('Remittance failed:', error);
    throw error;
  }
}
```

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Insufficient balance` | User doesn't have enough funds | Check balance before building transaction |
| `Invalid or non-existent recipient address` | Recipient account not found on network | Verify recipient address exists or create account first |
| `recipientAddress must be a valid Stellar public key` | Invalid address format | Validate address format on frontend |
| `Not authenticated` | User session expired | Redirect to login |

### Frontend Validation

Validate inputs before calling the API to provide better UX:

```typescript
function validateRemittanceInput(
  amount: number,
  recipientAddress: string,
  currency: string
): { valid: boolean; error?: string } {
  // Validate amount
  if (!amount || amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  // Validate recipient address format
  if (!/^G[A-Z0-9]{55}$/.test(recipientAddress)) {
    return { valid: false, error: 'Invalid Stellar address format' };
  }

  // Validate currency
  if (!['USDC', 'XLM'].includes(currency)) {
    return { valid: false, error: 'Currency must be USDC or XLM' };
  }

  return { valid: true };
}
```

## Testing

### Test Cases

1. **Valid USDC Transfer**
```bash
curl -X POST http://localhost:3000/api/remittance/build \
  -H "Content-Type: application/json" \
  -H "Cookie: remitwise_session=..." \
  -d '{
    "amount": 100.50,
    "recipientAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "currency": "USDC",
    "memo": "Payment for services"
  }'
```

2. **Valid XLM Transfer**
```bash
curl -X POST http://localhost:3000/api/remittance/build \
  -H "Content-Type: application/json" \
  -H "Cookie: remitwise_session=..." \
  -d '{
    "amount": 50,
    "recipientAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "currency": "XLM"
  }'
```

3. **Invalid Amount**
```bash
curl -X POST http://localhost:3000/api/remittance/build \
  -H "Content-Type: application/json" \
  -H "Cookie: remitwise_session=..." \
  -d '{
    "amount": -10,
    "recipientAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }'
# Expected: 400 with "amount is required and must be a positive number"
```

4. **Invalid Address**
```bash
curl -X POST http://localhost:3000/api/remittance/build \
  -H "Content-Type: application/json" \
  -H "Cookie: remitwise_session=..." \
  -d '{
    "amount": 100,
    "recipientAddress": "invalid-address"
  }'
# Expected: 400 with "recipientAddress must be a valid Stellar public key"
```

## Environment Variables

Add to `.env.local`:

```bash
# Optional: USDC issuer address (defaults to testnet USDC)
USDC_ISSUER_ADDRESS=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5

# Soroban RPC URL (required)
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Network passphrase (required)
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

## Notes

- The endpoint builds but does NOT sign or submit transactions
- Transaction signing must happen in the user's wallet (client-side)
- The simulation step helps catch errors before user signs
- Transactions expire after 5 minutes (300 seconds)
- USDC transfers require the recipient to have a trustline for USDC
- XLM transfers require the recipient account to exist (minimum 1 XLM balance)

## Related Endpoints

- `POST /api/remittance/allocate` - Allocate remittance after successful submission
- `POST /api/send` - Legacy send endpoint (to be deprecated)
