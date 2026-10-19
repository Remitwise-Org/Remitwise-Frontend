# Transaction Integration Guide

## Overview

The RemitWise backend provides transaction building services for remittance split configuration. **The backend only builds unsigned transactions** - the frontend is responsible for:

1. **Signing transactions** with the user's wallet (e.g., Freighter)
2. **Submitting signed transactions** to the Stellar network
3. **Monitoring transaction status** and confirmations

## Authentication

All API endpoints require authentication via Bearer token in the Authorization header:

```typescript
const authToken = createSessionToken(userAddress, userPublicKey);

headers: {
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json'
}
```

## Initialize Split Flow

### 1. Build Transaction

Call the API to build an unsigned transaction:

```typescript
const response = await fetch('/api/split/initialize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify({
    spending: 40,
    savings: 30,
    bills: 20,
    insurance: 10
  })
});

const data = await response.json();

if (!data.success) {
  console.error('Failed to build transaction:', data.error);
  return;
}

const { xdr, simulate } = data;
```

### 2. Sign Transaction

Sign the transaction with the user's wallet:

```typescript
// Using Freighter wallet
const signedXdr = await window.freighter.signTransaction(xdr, {
  network: 'TESTNET', // or 'PUBLIC' for mainnet
  networkPassphrase: 'Test SDF Network ; September 2015'
});
```

### 3. Submit to Network

Submit the signed transaction to Stellar:

```typescript
import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.SorobanRpc.Server(
  'https://horizon-testnet.stellar.org'
);

try {
  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    'Test SDF Network ; September 2015'
  );
  
  const result = await server.sendTransaction(transaction);
  
  if (result.status === 'SUCCESS') {
    console.log('Split initialized successfully!');
    console.log('Transaction hash:', result.hash);
  } else {
    console.error('Transaction failed:', result);
  }
} catch (error) {
  console.error('Submission error:', error);
}
```

## Update Split Flow

The update flow follows the same pattern as initialize:

```typescript
const response = await fetch('/api/split/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify({
    spending: 50,
    savings: 25,
    bills: 15,
    insurance: 10
  })
});

// Follow same signing and submission steps as initialize
```

## Error Handling

### Validation Errors (400)

```typescript
if (response.status === 400) {
  const error = await response.json();
  // Show validation error to user
  showError(error.error);
  // Example: "Percentages must sum to 100. Current sum: 95"
}
```

### Authentication Errors (401)

```typescript
if (response.status === 401) {
  // Redirect to login
  redirectToLogin();
}
```

### Server Errors (500)

```typescript
if (response.status === 500) {
  const error = await response.json();
  // Show generic error and suggest retry
  showError('Server error. Please try again.');
  console.error('Server error:', error.error);
}
```

### Network Errors (503)

```typescript
if (response.status === 503) {
  // Network unavailable, suggest retry
  showError('Network temporarily unavailable. Please try again.');
}
```

## Complete Example

```typescript
async function initializeSplit(percentages: {
  spending: number;
  savings: number;
  bills: number;
  insurance: number;
}) {
  try {
    // 1. Build transaction
    const response = await fetch('/api/split/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(percentages)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to build transaction');
    }

    const { xdr, simulate } = await response.json();

    // Show estimated cost to user
    if (simulate) {
      console.log('Estimated cost:', simulate.cost, 'stroops');
    }

    // 2. Sign with wallet
    const signedXdr = await window.freighter.signTransaction(xdr, {
      network: 'TESTNET'
    });

    // 3. Submit to network
    const server = new StellarSdk.SorobanRpc.Server(
      'https://horizon-testnet.stellar.org'
    );

    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      'Test SDF Network ; September 2015'
    );

    const result = await server.sendTransaction(transaction);

    if (result.status === 'SUCCESS') {
      return {
        success: true,
        hash: result.hash
      };
    } else {
      throw new Error('Transaction failed');
    }

  } catch (error) {
    console.error('Initialize split error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## API Response Format

### Success Response

```typescript
{
  success: true,
  xdr: "AAAAAgAAAAC...", // Base64-encoded transaction XDR
  simulate?: {
    cost: "1000000",     // Estimated cost in stroops
    results: []          // Simulation results
  },
  message: "Transaction built successfully. Please sign with your wallet and submit to the network."
}
```

### Error Response

```typescript
{
  success: false,
  error: "Percentages must sum to 100. Current sum: 95"
}
```

## Important Notes

1. **Backend Responsibility**: The backend ONLY builds transactions. It does NOT sign or submit them.

2. **Frontend Responsibility**: The frontend MUST:
   - Sign transactions with the user's wallet
   - Submit signed transactions to the Stellar network
   - Handle transaction status and confirmations

3. **User Custody**: Users maintain full custody of their funds. Private keys never leave the user's wallet.

4. **Validation**: Percentages must sum to exactly 100. The API will reject invalid inputs.

5. **Authentication**: All requests must include a valid Bearer token in the Authorization header.

6. **Network**: Ensure you're using the correct network (testnet vs mainnet) consistently across all operations.

## Testing

For testing, you can create a session token:

```typescript
import { createSessionToken } from '@/lib/auth/session';

const token = createSessionToken(
  'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
);
```

## Support

For issues or questions:
- Check the error message in the API response
- Verify percentages sum to 100
- Ensure authentication token is valid
- Confirm network configuration matches between backend and frontend
