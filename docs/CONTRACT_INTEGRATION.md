# Remittance Split Contract Integration

This document describes the server-side integration with the Soroban remittance_split contract.

## Setup

### Environment Variables

Add to your `.env.local`:

```bash
STELLAR_NETWORK=testnet
REMITTANCE_SPLIT_CONTRACT_ID=<your_deployed_contract_id>
```

**Prerequisites:**
- The remittance_split contract must be deployed on the specified network
- The contract ID must be set in environment variables

## Contract Functions

Located in `lib/contracts/remittance-split.ts`:

### `getSplit(env)`

Reads the current split configuration from the contract.

```typescript
const config = await getSplit('testnet');
// Returns: { savings_percent, bills_percent, insurance_percent, family_percent } | null
```

### `getConfig(env)`

Alias for `getSplit()`.

### `calculateSplit(amount, env)`

Calculates split amounts based on the configured percentages.

```typescript
const amounts = await calculateSplit(1000, 'testnet');
// Returns: { savings, bills, insurance, family, remainder } | null
```

## API Endpoints

### GET /api/split

Returns the current split configuration percentages.

**Response:**
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

### GET /api/split/calculate?amount=1000

Calculates split amounts for a given remittance amount.

**Query Parameters:**
- `amount` (required): The total amount to split

**Response:**
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

## Error Handling

All endpoints handle the following errors:

- **Contract not configured**: Returns 500 with message "REMITTANCE_SPLIT_CONTRACT_ID not configured"
- **Contract not deployed**: Returns 404 with message "Split configuration not found"
- **RPC errors**: Returns 500 with descriptive error message
- **Invalid parameters**: Returns 400 with validation error

## Usage in Frontend

```typescript
// Fetch current configuration
const response = await fetch('/api/split');
const { percentages } = await response.json();

// Calculate split for amount
const response = await fetch('/api/split/calculate?amount=1000');
const { amounts } = await response.json();
```
