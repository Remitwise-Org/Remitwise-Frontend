# Savings Goals Transactions API Documentation

This document provides comprehensive documentation for the Savings Goals transaction building API. The API allows frontend applications to build Stellar blockchain transactions for creating and managing savings goals.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Transaction Builder Functions](#transaction-builder-functions)
- [Error Handling](#error-handling)
- [Frontend Integration Examples](#frontend-integration-examples)

## Overview

The Savings Goals Transactions API provides endpoints that build unsigned Stellar transactions and return them as XDR strings. The frontend is responsible for:

1. Calling the API endpoint with required parameters
2. Receiving the transaction XDR
3. Signing the transaction with the user's wallet (e.g., Freighter)
4. Submitting the signed transaction to the Stellar network

This architecture keeps private keys secure on the client side while allowing the backend to handle transaction construction logic.

## Authentication

All API endpoints require authentication via one of the following methods:

### Authorization Header
```
Authorization: Bearer <stellar_public_key>
```

### Custom Header
```
x-stellar-public-key: <stellar_public_key>
```

### Cookie
```
stellar_public_key=<stellar_public_key>
```

The public key must be a valid Stellar public key (56 characters, starting with 'G').

**Example:**
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
};
```

## API Endpoints

### POST /api/goals

Create a new savings goal.

**Request Body:**
```typescript
{
  name: string;         // Goal name (1-100 characters)
  targetAmount: number; // Target amount (positive number)
  targetDate: string;   // ISO 8601 date string (must be in the future)
}
```

**Success Response (200):**
```typescript
{
  xdr: string; // Base64-encoded transaction XDR
}
```

**Error Responses:**
- `400` - Validation error (invalid input)
- `401` - Authentication error (missing or invalid session)
- `500` - Server error

**Example Request:**
```typescript
const response = await fetch('/api/goals', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer GXXXXXXX...'
  },
  body: JSON.stringify({
    name: "Emergency Fund",
    targetAmount: 5000,
    targetDate: "2025-12-31T00:00:00Z"
  })
});

const { xdr } = await response.json();
```

---

### POST /api/goals/[id]/add

Add funds to an existing savings goal.

**URL Parameters:**
- `id` - Goal identifier (non-empty string)

**Request Body:**
```typescript
{
  amount: number; // Amount to add (positive number)
}
```

**Success Response (200):**
```typescript
{
  xdr: string; // Base64-encoded transaction XDR
}
```

**Error Responses:**
- `400` - Validation error (invalid goal ID or amount)
- `401` - Authentication error
- `500` - Server error

**Example Request:**
```typescript
const goalId = "goal_123";
const response = await fetch(`/api/goals/${goalId}/add`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer GXXXXXXX...'
  },
  body: JSON.stringify({
    amount: 100
  })
});

const { xdr } = await response.json();
```

---

### POST /api/goals/[id]/withdraw

Withdraw funds from a savings goal.

**URL Parameters:**
- `id` - Goal identifier (non-empty string)

**Request Body:**
```typescript
{
  amount: number; // Amount to withdraw (positive number)
}
```

**Success Response (200):**
```typescript
{
  xdr: string; // Base64-encoded transaction XDR
}
```

**Error Responses:**
- `400` - Validation error (invalid goal ID or amount)
- `401` - Authentication error
- `500` - Server error

**Example Request:**
```typescript
const goalId = "goal_123";
const response = await fetch(`/api/goals/${goalId}/withdraw`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer GXXXXXXX...'
  },
  body: JSON.stringify({
    amount: 50
  })
});

const { xdr } = await response.json();
```

---

### POST /api/goals/[id]/lock

Lock a savings goal to prevent withdrawals.

**URL Parameters:**
- `id` - Goal identifier (non-empty string)

**Request Body:** Empty

**Success Response (200):**
```typescript
{
  xdr: string; // Base64-encoded transaction XDR
}
```

**Error Responses:**
- `400` - Validation error (invalid goal ID)
- `401` - Authentication error
- `500` - Server error

**Example Request:**
```typescript
const goalId = "goal_123";
const response = await fetch(`/api/goals/${goalId}/lock`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer GXXXXXXX...'
  }
});

const { xdr } = await response.json();
```

---

### POST /api/goals/[id]/unlock

Unlock a savings goal to allow withdrawals.

**URL Parameters:**
- `id` - Goal identifier (non-empty string)

**Request Body:** Empty

**Success Response (200):**
```typescript
{
  xdr: string; // Base64-encoded transaction XDR
}
```

**Error Responses:**
- `400` - Validation error (invalid goal ID)
- `401` - Authentication error
- `500` - Server error

**Example Request:**
```typescript
const goalId = "goal_123";
const response = await fetch(`/api/goals/${goalId}/unlock`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer GXXXXXXX...'
  }
});

const { xdr } = await response.json();
```

## Transaction Builder Functions

The following functions are available in `lib/contracts/savings-goals.ts` for building transactions programmatically:

### buildCreateGoalTx

```typescript
async function buildCreateGoalTx(
  owner: string,
  name: string,
  targetAmount: number,
  targetDate: string
): Promise<BuildTxResult>
```

Builds a transaction to create a new savings goal.

**Parameters:**
- `owner` - Stellar public key of the goal owner
- `name` - Goal name (1-100 characters)
- `targetAmount` - Target amount (positive number)
- `targetDate` - ISO 8601 date string (future date)

**Returns:** `{ xdr: string }`

---

### buildAddToGoalTx

```typescript
async function buildAddToGoalTx(
  caller: string,
  goalId: string,
  amount: number
): Promise<BuildTxResult>
```

Builds a transaction to add funds to a goal.

**Parameters:**
- `caller` - Stellar public key of the caller
- `goalId` - Unique goal identifier
- `amount` - Amount to add (positive number)

**Returns:** `{ xdr: string }`

---

### buildWithdrawFromGoalTx

```typescript
async function buildWithdrawFromGoalTx(
  caller: string,
  goalId: string,
  amount: number
): Promise<BuildTxResult>
```

Builds a transaction to withdraw funds from a goal.

**Parameters:**
- `caller` - Stellar public key of the caller
- `goalId` - Unique goal identifier
- `amount` - Amount to withdraw (positive number)

**Returns:** `{ xdr: string }`

---

### buildLockGoalTx

```typescript
async function buildLockGoalTx(
  caller: string,
  goalId: string
): Promise<BuildTxResult>
```

Builds a transaction to lock a goal.

**Parameters:**
- `caller` - Stellar public key of the caller
- `goalId` - Unique goal identifier

**Returns:** `{ xdr: string }`

---

### buildUnlockGoalTx

```typescript
async function buildUnlockGoalTx(
  caller: string,
  goalId: string
): Promise<BuildTxResult>
```

Builds a transaction to unlock a goal.

**Parameters:**
- `caller` - Stellar public key of the caller
- `goalId` - Unique goal identifier

**Returns:** `{ xdr: string }`

## Error Handling

All endpoints return consistent error responses:

```typescript
{
  error: string;    // Brief error message
  details?: string; // Optional detailed explanation
}
```

### Common Error Scenarios

#### Validation Errors (400)

```typescript
// Missing required field
{
  error: "Missing required field",
  details: "Goal name is required"
}

// Invalid amount
{
  error: "Invalid amount",
  details: "Amount must be positive"
}

// Invalid date
{
  error: "Invalid target date",
  details: "Target date must be in the future"
}
```

#### Authentication Errors (401)

```typescript
// Missing authentication
{
  error: "Authentication required",
  details: "Please provide a valid session"
}

// Invalid session
{
  error: "Invalid session",
  details: "Session does not contain a valid public key"
}
```

#### Server Errors (500)

```typescript
{
  error: "Internal server error",
  details: "An unexpected error occurred"
}
```

### Error Handling Example

```typescript
async function createGoal(name: string, targetAmount: number, targetDate: string) {
  try {
    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userPublicKey}`
      },
      body: JSON.stringify({ name, targetAmount, targetDate })
    });

    if (!response.ok) {
      const { error, details } = await response.json();
      throw new Error(`${error}: ${details || ''}`);
    }

    const { xdr } = await response.json();
    return xdr;
  } catch (error) {
    console.error('Failed to create goal:', error);
    throw error;
  }
}
```

## Frontend Integration Examples

### Complete Flow: Create and Fund a Goal

```typescript
import * as StellarSdk from '@stellar/stellar-sdk';

// Step 1: Create the goal
async function createAndFundGoal() {
  const userPublicKey = 'GXXXXXXX...'; // From wallet
  
  // Create goal
  const createResponse = await fetch('/api/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userPublicKey}`
    },
    body: JSON.stringify({
      name: "Vacation Fund",
      targetAmount: 3000,
      targetDate: "2025-08-01T00:00:00Z"
    })
  });
  
  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(error.error);
  }
  
  const { xdr: createXdr } = await createResponse.json();
  
  // Step 2: Sign with Freighter
  const signedCreateXdr = await window.freighter.signTransaction(createXdr, {
    network: 'TESTNET'
  });
  
  // Step 3: Submit to network
  const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    signedCreateXdr,
    StellarSdk.Networks.TESTNET
  );
  
  const result = await server.sendTransaction(transaction);
  console.log('Goal created:', result);
  
  // Step 4: Add initial funds
  const goalId = extractGoalIdFromResult(result); // Custom function
  
  const addResponse = await fetch(`/api/goals/${goalId}/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userPublicKey}`
    },
    body: JSON.stringify({ amount: 500 })
  });
  
  const { xdr: addXdr } = await addResponse.json();
  const signedAddXdr = await window.freighter.signTransaction(addXdr, {
    network: 'TESTNET'
  });
  
  const addResult = await server.sendTransaction(
    StellarSdk.TransactionBuilder.fromXDR(signedAddXdr, StellarSdk.Networks.TESTNET)
  );
  
  console.log('Funds added:', addResult);
}
```

### React Hook Example

```typescript
import { useState } from 'react';

function useGoalTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const executeTransaction = async (
    endpoint: string,
    body?: any
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get user's public key from context/state
      const publicKey = getUserPublicKey();
      
      // Build transaction
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicKey}`
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      if (!response.ok) {
        const { error, details } = await response.json();
        throw new Error(details || error);
      }
      
      const { xdr } = await response.json();
      
      // Sign with wallet
      const signedXdr = await window.freighter.signTransaction(xdr, {
        network: 'TESTNET'
      });
      
      // Submit to network
      const server = new StellarSdk.SorobanRpc.Server(
        process.env.NEXT_PUBLIC_STELLAR_RPC_URL
      );
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        StellarSdk.Networks.TESTNET
      );
      
      const result = await server.sendTransaction(transaction);
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { executeTransaction, loading, error };
}

// Usage in component
function CreateGoalForm() {
  const { executeTransaction, loading, error } = useGoalTransaction();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await executeTransaction('/api/goals', {
        name: "My Goal",
        targetAmount: 1000,
        targetDate: "2025-12-31T00:00:00Z"
      });
      
      alert('Goal created successfully!');
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Goal'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

## Environment Configuration

Before using the API, ensure the following environment variables are configured:

```bash
# .env.local
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID=your_contract_id_here
```

## Testing

For testing purposes, you can use the Stellar testnet and test accounts:

1. Create a test account at https://laboratory.stellar.org/#account-creator
2. Fund it with test XLM from the friendbot
3. Use the test account's public key for authentication
4. Deploy your contract to testnet and update the contract ID

## Support

For issues or questions:
- Check the error response for detailed information
- Verify your environment variables are correctly set
- Ensure your Stellar account has sufficient XLM for transaction fees
- Confirm the contract is deployed and accessible on the network
