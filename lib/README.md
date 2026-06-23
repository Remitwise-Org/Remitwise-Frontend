# Library Modules

This directory contains reusable utility modules for the RemitWise application.

## Structure

```
lib/
├── auth/              # Authentication utilities
│   └── session.ts     # Session management and extraction
├── contracts/         # Stellar smart contract integrations
│   └── savings-goals.ts  # Savings goals transaction builders
├── errors/            # Error handling utilities
│   └── api-errors.ts  # API error response helpers
├── types/             # TypeScript type definitions
│   └── savings-goals.ts  # Types for savings goals
└── validation/        # Input validation utilities
    └── savings-goals.ts  # Validation functions for savings goals
```

## Modules

- [Prisma data model and durability boundary](../docs/data-model.md)

### Authentication (`auth/`)

**session.ts** - Session management utilities

- `getSessionFromRequest()` - Extract session from Next.js request
- `validateSession()` - Validate session structure
- `getPublicKeyFromSession()` - Extract public key from session

### Contracts (`contracts/`)

**savings-goals.ts** - Transaction builders for savings goals smart contract

- `buildCreateGoalTx()` - Build transaction to create a new goal
- `buildAddToGoalTx()` - Build transaction to add funds to a goal
- `buildWithdrawFromGoalTx()` - Build transaction to withdraw from a goal
- `buildLockGoalTx()` - Build transaction to lock a goal
- `buildUnlockGoalTx()` - Build transaction to unlock a goal

### Errors (`errors/`)

**api-errors.ts** - API error response utilities

- `createValidationError()` - Create 400 validation error response
- `createAuthenticationError()` - Create 401 authentication error response
- `createServerError()` - Create 500 server error response
- `createNotFoundError()` - Create 404 not found error response
- `handleUnexpectedError()` - Handle unexpected errors gracefully

### Types (`types/`)

**savings-goals.ts** - TypeScript interfaces and types

- `CreateGoalParams` - Parameters for creating a goal
- `GoalOperationParams` - Parameters for goal operations
- `BuildTxResult` - Transaction builder result
- `Session` - User session structure
- `ApiSuccessResponse` - API success response format
- `ApiErrorResponse` - API error response format

### Validation (`validation/`)

**savings-goals.ts** - Input validation functions

- `validateAmount()` - Validate positive number amounts
- `validateFutureDate()` - Validate dates are in the future
- `validateGoalId()` - Validate goal ID format
- `validateGoalName()` - Validate goal name format
- `validatePublicKey()` - Validate Stellar public key format

## Usage Examples

### Building a Transaction

```typescript
import { buildCreateGoalTx } from "@/lib/contracts/savings-goals";

const result = await buildCreateGoalTx(
  "GXXXXXXX...", // owner public key
  "Emergency Fund",
  5000,
  "2025-12-31T00:00:00Z",
);

console.log(result.xdr); // Transaction XDR string
```

### Validating Input

```typescript
import {
  validateAmount,
  validateFutureDate,
} from "@/lib/validation/savings-goals";

const amountValidation = validateAmount(100);
if (!amountValidation.isValid) {
  console.error(amountValidation.error);
}

const dateValidation = validateFutureDate("2025-12-31");
if (!dateValidation.isValid) {
  console.error(dateValidation.error);
}
```

### Handling Errors

```typescript
import {
  createValidationError,
  handleUnexpectedError,
} from "@/lib/errors/api-errors";

// Return validation error
if (!isValid) {
  return createValidationError("Invalid input", "Amount must be positive");
}

// Handle unexpected errors
try {
  // ... some operation
} catch (error) {
  return handleUnexpectedError(error);
}
```

### Session Management

```typescript
import {
  getSessionFromRequest,
  getPublicKeyFromSession,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAuthenticationError();
  }

  const publicKey = getPublicKeyFromSession(session);
  // ... use publicKey
}
```

## Testing

All validation functions return a `ValidationResult` object:

```typescript
interface ValidationResult {
  isValid: boolean;
  error?: string;
}
```

This makes it easy to test validation logic:

```typescript
const result = validateAmount(-5);
expect(result.isValid).toBe(false);
expect(result.error).toBe("Amount must be positive");
```

## Adding New Modules

When adding new modules to this directory:

1. Create a new subdirectory for the module category (if needed)
2. Add TypeScript files with clear, focused functionality
3. Export all public functions and types
4. Add JSDoc comments for all exported functions
5. Update this README with the new module information
6. Add corresponding tests in the `__tests__` directory

## Dependencies

- `@stellar/stellar-sdk` - Stellar blockchain SDK
- `next` - Next.js framework (for server utilities)

## Environment Variables

Some modules require environment variables:

```bash
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID=your_contract_id
```

See `.env.local.example` for a complete list.
