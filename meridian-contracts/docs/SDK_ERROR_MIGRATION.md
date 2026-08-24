# SDK Error Handling Migration Guide

## Overview

This guide helps SDK and API developers migrate from panic-based error handling to strongly-typed error codes in the Meridian smart contracts.

## Breaking Changes Summary

### Before (Panic-based)

```typescript
// ❌ Old SDK - Unstructured errors
try {
  const escrowId = await contract.createEscrow(params);
} catch (error) {
  // Generic HostError with string message
  console.error(error.message); // "Invalid nonce" - just a string
}
```

### After (Error Codes)

```typescript
// ✅ New SDK - Structured error codes
try {
  const escrowId = await contract.createEscrow(params);
} catch (error) {
  // Typed error with numeric code
  if (error.code === EscrowError.INVALID_NONCE) {
    // Handle specific error type
  }
}
```

## Error Code Mappings

### TypeScript/JavaScript SDK

Create type-safe error definitions:

```typescript
// errors.ts

/**
 * Escrow contract error codes
 * Maps to EscrowError enum in contracts/lib/src/errors.rs
 */
export enum EscrowError {
  ALREADY_INITIALIZED = 1,
  UNAUTHORIZED = 2,
  INVALID_NONCE = 3,
  TOO_MANY_PARTICIPANTS = 4,
  ESCROW_NOT_FOUND = 5,
  INVALID_STATUS = 6,
  DEPOSIT_EXCEEDS_AMOUNT = 7,
  TIME_LOCK_ACTIVE = 8,
  SIGNATURE_THRESHOLD_NOT_MET = 9,
  ALREADY_SIGNED = 10,
}

export const EscrowErrorMessages: Record<EscrowError, string> = {
  [EscrowError.ALREADY_INITIALIZED]: 
    "Contract has already been initialized",
  [EscrowError.UNAUTHORIZED]: 
    "You don't have permission to perform this action",
  [EscrowError.INVALID_NONCE]: 
    "Transaction nonce is invalid. Please refresh and try again",
  [EscrowError.TOO_MANY_PARTICIPANTS]: 
    "Too many participants (maximum 10 allowed)",
  [EscrowError.ESCROW_NOT_FOUND]: 
    "Escrow not found",
  [EscrowError.INVALID_STATUS]: 
    "Operation not allowed in current escrow status",
  [EscrowError.DEPOSIT_EXCEEDS_AMOUNT]: 
    "Deposit amount exceeds escrow total",
  [EscrowError.TIME_LOCK_ACTIVE]: 
    "Time lock is still active. Please wait until expiration",
  [EscrowError.SIGNATURE_THRESHOLD_NOT_MET]: 
    "Insufficient signatures for multi-sig approval",
  [EscrowError.ALREADY_SIGNED]: 
    "You have already signed this approval",
};

/**
 * Risk Pool contract error codes
 * Maps to RiskPoolError enum in contracts/lib/src/errors.rs
 */
export enum RiskPoolError {
  ALREADY_INITIALIZED = 1,
  NOT_INITIALIZED = 2,
  BELOW_MINIMUM_STAKE = 3,
  INSUFFICIENT_STAKE = 4,
  INSUFFICIENT_POOL_FUNDS = 5,
}

export const RiskPoolErrorMessages: Record<RiskPoolError, string> = {
  [RiskPoolError.ALREADY_INITIALIZED]: 
    "Contract has already been initialized",
  [RiskPoolError.NOT_INITIALIZED]: 
    "Contract not initialized",
  [RiskPoolError.BELOW_MINIMUM_STAKE]: 
    "Deposit amount is below the minimum stake requirement",
  [RiskPoolError.INSUFFICIENT_STAKE]: 
    "Insufficient stake for withdrawal",
  [RiskPoolError.INSUFFICIENT_POOL_FUNDS]: 
    "Pool has insufficient funds for this operation",
};

/**
 * Governance contract error codes
 * Maps to GovernanceError enum in contracts/lib/src/errors.rs
 */
export enum GovernanceError {
  ALREADY_INITIALIZED = 1,
  NOT_INITIALIZED = 2,
  VOTING_PERIOD_ENDED = 3,
  ALREADY_VOTED = 4,
  VOTING_PERIOD_NOT_ENDED = 5,
  MUST_FINALIZE_FIRST = 6,
  ALREADY_EXECUTED = 7,
  THRESHOLD_NOT_MET = 8,
  CLAIMS_CONTRACT_NOT_SET = 9,
  RISK_POOL_CONTRACT_NOT_SET = 10,
  POLICY_CONTRACT_NOT_SET = 11,
}

export const GovernanceErrorMessages: Record<GovernanceError, string> = {
  [GovernanceError.ALREADY_INITIALIZED]: 
    "Contract has already been initialized",
  [GovernanceError.NOT_INITIALIZED]: 
    "Contract not initialized",
  [GovernanceError.VOTING_PERIOD_ENDED]: 
    "Voting period has ended for this proposal",
  [GovernanceError.ALREADY_VOTED]: 
    "You have already voted on this proposal",
  [GovernanceError.VOTING_PERIOD_NOT_ENDED]: 
    "Voting period is still active",
  [GovernanceError.MUST_FINALIZE_FIRST]: 
    "Proposal must be finalized before execution",
  [GovernanceError.ALREADY_EXECUTED]: 
    "Proposal has already been executed",
  [GovernanceError.THRESHOLD_NOT_MET]: 
    "Vote threshold not met for proposal execution",
  [GovernanceError.CLAIMS_CONTRACT_NOT_SET]: 
    "Claims contract not configured",
  [GovernanceError.RISK_POOL_CONTRACT_NOT_SET]: 
    "Risk pool contract not configured",
  [GovernanceError.POLICY_CONTRACT_NOT_SET]: 
    "Policy contract not configured",
};

/**
 * Validation error codes (shared across contracts)
 * Maps to ValidationError enum in contracts/lib/src/errors.rs
 */
export enum ValidationError {
  ZERO_ADDRESS = 1,
  NON_POSITIVE_AMOUNT = 2,
  INVALID_TIMESTAMP = 3,
  INVALID_MULTISIG_CONFIG = 4,
  CONTRACT_PAUSED = 5,
}

export const ValidationErrorMessages: Record<ValidationError, string> = {
  [ValidationError.ZERO_ADDRESS]: 
    "Zero address not allowed",
  [ValidationError.NON_POSITIVE_AMOUNT]: 
    "Amount must be greater than zero",
  [ValidationError.INVALID_TIMESTAMP]: 
    "Invalid timestamp",
  [ValidationError.INVALID_MULTISIG_CONFIG]: 
    "Invalid multi-signature configuration",
  [ValidationError.CONTRACT_PAUSED]: 
    "Contract is currently paused",
};
```

### Error Wrapper Class

Create a custom error class for better error handling:

```typescript
// contractError.ts

export class ContractError extends Error {
  constructor(
    public readonly code: number,
    public readonly contractType: 'escrow' | 'riskpool' | 'governance',
    public readonly userMessage: string,
    public readonly technicalDetails?: any
  ) {
    super(userMessage);
    this.name = 'ContractError';
  }

  static fromSorobanError(
    error: any, 
    contractType: 'escrow' | 'riskpool' | 'governance'
  ): ContractError {
    // Extract error code from Soroban error
    const code = error.code || error.error?.code || 0;
    
    let userMessage: string;
    
    switch (contractType) {
      case 'escrow':
        userMessage = EscrowErrorMessages[code as EscrowError] 
          || 'Unknown escrow error';
        break;
      case 'riskpool':
        userMessage = RiskPoolErrorMessages[code as RiskPoolError] 
          || 'Unknown risk pool error';
        break;
      case 'governance':
        userMessage = GovernanceErrorMessages[code as GovernanceError] 
          || 'Unknown governance error';
        break;
      default:
        userMessage = 'Unknown contract error';
    }
    
    return new ContractError(code, contractType, userMessage, error);
  }

  isRetryable(): boolean {
    // Some errors can be retried, others are permanent
    const retryableCodes = [
      EscrowError.CONTRACT_PAUSED,
      RiskPoolError.INSUFFICIENT_POOL_FUNDS,
      // Add more retryable errors
    ];
    return retryableCodes.includes(this.code);
  }

  isAuthError(): boolean {
    return this.code === EscrowError.UNAUTHORIZED;
  }
}
```

## SDK Implementation Examples

### Escrow Client Wrapper

```typescript
// escrowClient.ts

import { Contract, SorobanRpc } from '@stellar/stellar-sdk';
import { ContractError, EscrowError } from './errors';

export class EscrowClient {
  constructor(
    private contract: Contract,
    private server: SorobanRpc.Server
  ) {}

  async createEscrow(params: {
    propertyId: number;
    amount: bigint;
    buyer: string;
    seller: string;
    participants: string[];
    requiredSignatures: number;
    releaseTimeLock?: number;
    nonce: number;
  }): Promise<number> {
    try {
      const result = await this.contract.call(
        'create_escrow_advanced',
        params.propertyId,
        params.amount,
        params.buyer,
        params.seller,
        params.participants,
        params.requiredSignatures,
        params.releaseTimeLock,
        params.nonce
      );
      
      // Result is wrapped in Ok/Err
      if (result.isErr()) {
        throw ContractError.fromSorobanError(result.error, 'escrow');
      }
      
      return result.unwrap();
    } catch (error) {
      if (error instanceof ContractError) {
        throw error;
      }
      throw ContractError.fromSorobanError(error, 'escrow');
    }
  }

  async depositFunds(escrowId: number, amount: bigint): Promise<void> {
    try {
      const result = await this.contract.call(
        'deposit_funds',
        escrowId,
        amount
      );
      
      if (result.isErr()) {
        throw ContractError.fromSorobanError(result.error, 'escrow');
      }
    } catch (error) {
      if (error instanceof ContractError) {
        throw error;
      }
      throw ContractError.fromSorobanError(error, 'escrow');
    }
  }

  async releaseFunds(escrowId: number): Promise<void> {
    try {
      const result = await this.contract.call('release_funds', escrowId);
      
      if (result.isErr()) {
        const contractError = ContractError.fromSorobanError(
          result.error, 
          'escrow'
        );
        
        // Add specific handling for time lock
        if (contractError.code === EscrowError.TIME_LOCK_ACTIVE) {
          // Could fetch time lock info and add to error
          throw new ContractError(
            contractError.code,
            contractError.contractType,
            `${contractError.userMessage}. Time lock expires at: ${await this.getTimeLockExpiry(escrowId)}`,
            contractError.technicalDetails
          );
        }
        
        throw contractError;
      }
    } catch (error) {
      if (error instanceof ContractError) {
        throw error;
      }
      throw ContractError.fromSorobanError(error, 'escrow');
    }
  }

  private async getTimeLockExpiry(escrowId: number): Promise<Date> {
    const escrow = await this.contract.call('get_escrow', escrowId);
    return new Date(escrow.release_time_lock * 1000);
  }
}
```

### React Hook Example

```typescript
// useEscrow.ts

import { useState } from 'react';
import { EscrowClient } from './escrowClient';
import { ContractError, EscrowError } from './errors';

export function useEscrow(client: EscrowClient) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const createEscrow = async (params: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const escrowId = await client.createEscrow(params);
      return escrowId;
    } catch (err) {
      if (err instanceof ContractError) {
        setError(err);
        
        // Handle specific errors
        switch (err.code) {
          case EscrowError.INVALID_NONCE:
            // Automatically fetch new nonce and retry?
            console.log('Nonce mismatch, consider auto-retry');
            break;
          case EscrowError.UNAUTHORIZED:
            // Prompt for authentication
            console.log('User needs to authenticate');
            break;
          case EscrowError.TOO_MANY_PARTICIPANTS:
            // Show specific UI feedback
            console.log('Reduce number of participants');
            break;
        }
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const depositFunds = async (escrowId: number, amount: bigint) => {
    setLoading(true);
    setError(null);
    
    try {
      await client.depositFunds(escrowId, amount);
    } catch (err) {
      if (err instanceof ContractError) {
        setError(err);
        
        if (err.code === EscrowError.DEPOSIT_EXCEEDS_AMOUNT) {
          // Could fetch escrow details to show remaining amount
          console.log('Deposit too large, fetch remaining capacity');
        }
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createEscrow, depositFunds, loading, error };
}
```

### UI Error Display Component

```typescript
// ErrorDisplay.tsx

import React from 'react';
import { ContractError, EscrowError } from './errors';

interface Props {
  error: ContractError;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<Props> = ({ error, onRetry }) => {
  const getErrorSeverity = () => {
    // Critical errors
    if ([
      EscrowError.ALREADY_INITIALIZED,
      EscrowError.ESCROW_NOT_FOUND,
    ].includes(error.code)) {
      return 'critical';
    }
    
    // Warning errors (user can fix)
    if ([
      EscrowError.INVALID_NONCE,
      EscrowError.TOO_MANY_PARTICIPANTS,
      EscrowError.DEPOSIT_EXCEEDS_AMOUNT,
    ].includes(error.code)) {
      return 'warning';
    }
    
    // Info errors (temporary conditions)
    if ([
      EscrowError.TIME_LOCK_ACTIVE,
      EscrowError.SIGNATURE_THRESHOLD_NOT_MET,
    ].includes(error.code)) {
      return 'info';
    }
    
    return 'error';
  };

  const getActionableHelp = () => {
    switch (error.code) {
      case EscrowError.INVALID_NONCE:
        return 'Please refresh the page and try again.';
      case EscrowError.UNAUTHORIZED:
        return 'Please connect your wallet with the correct account.';
      case EscrowError.TOO_MANY_PARTICIPANTS:
        return 'Maximum 10 participants allowed. Please reduce the number.';
      case EscrowError.TIME_LOCK_ACTIVE:
        return 'Please wait for the time lock to expire before proceeding.';
      case EscrowError.SIGNATURE_THRESHOLD_NOT_MET:
        return 'More signatures required. Please coordinate with other signers.';
      default:
        return 'Please try again or contact support if the issue persists.';
    }
  };

  return (
    <div className={`error-display severity-${getErrorSeverity()}`}>
      <div className="error-title">
        {error.userMessage}
      </div>
      <div className="error-help">
        {getActionableHelp()}
      </div>
      {error.isRetryable() && onRetry && (
        <button onClick={onRetry}>
          Retry
        </button>
      )}
      {process.env.NODE_ENV === 'development' && (
        <details>
          <summary>Technical Details</summary>
          <pre>{JSON.stringify(error.technicalDetails, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};
```

## Python SDK Example

```python
# errors.py

from enum import IntEnum
from typing import Optional

class EscrowError(IntEnum):
    ALREADY_INITIALIZED = 1
    UNAUTHORIZED = 2
    INVALID_NONCE = 3
    TOO_MANY_PARTICIPANTS = 4
    ESCROW_NOT_FOUND = 5
    INVALID_STATUS = 6
    DEPOSIT_EXCEEDS_AMOUNT = 7
    TIME_LOCK_ACTIVE = 8
    SIGNATURE_THRESHOLD_NOT_MET = 9
    ALREADY_SIGNED = 10

ESCROW_ERROR_MESSAGES = {
    EscrowError.ALREADY_INITIALIZED: "Contract has already been initialized",
    EscrowError.UNAUTHORIZED: "Unauthorized access",
    EscrowError.INVALID_NONCE: "Invalid transaction nonce",
    EscrowError.TOO_MANY_PARTICIPANTS: "Too many participants (max 10)",
    EscrowError.ESCROW_NOT_FOUND: "Escrow not found",
    EscrowError.INVALID_STATUS: "Invalid escrow status",
    EscrowError.DEPOSIT_EXCEEDS_AMOUNT: "Deposit exceeds escrow amount",
    EscrowError.TIME_LOCK_ACTIVE: "Time lock is active",
    EscrowError.SIGNATURE_THRESHOLD_NOT_MET: "Signature threshold not met",
    EscrowError.ALREADY_SIGNED: "Already signed",
}

class ContractError(Exception):
    def __init__(
        self, 
        code: int, 
        contract_type: str,
        user_message: str,
        technical_details: Optional[dict] = None
    ):
        self.code = code
        self.contract_type = contract_type
        self.user_message = user_message
        self.technical_details = technical_details
        super().__init__(user_message)
    
    @classmethod
    def from_soroban_error(cls, error, contract_type: str):
        code = getattr(error, 'code', 0)
        
        if contract_type == 'escrow':
            message = ESCROW_ERROR_MESSAGES.get(
                code, 
                "Unknown escrow error"
            )
        else:
            message = "Unknown contract error"
        
        return cls(code, contract_type, message, error.__dict__)
    
    def is_retryable(self) -> bool:
        retryable_codes = [
            EscrowError.TIME_LOCK_ACTIVE,
        ]
        return self.code in retryable_codes

# escrow_client.py

from stellar_sdk import SorobanServer, Contract
from .errors import ContractError, EscrowError

class EscrowClient:
    def __init__(self, contract: Contract, server: SorobanServer):
        self.contract = contract
        self.server = server
    
    def create_escrow(
        self,
        property_id: int,
        amount: int,
        buyer: str,
        seller: str,
        participants: list[str],
        required_signatures: int,
        release_time_lock: Optional[int],
        nonce: int
    ) -> int:
        try:
            result = self.contract.invoke(
                'create_escrow_advanced',
                property_id,
                amount,
                buyer,
                seller,
                participants,
                required_signatures,
                release_time_lock,
                nonce
            )
            
            if result.is_err():
                raise ContractError.from_soroban_error(
                    result.error, 
                    'escrow'
                )
            
            return result.unwrap()
        except Exception as e:
            if isinstance(e, ContractError):
                raise
            raise ContractError.from_soroban_error(e, 'escrow')
```

## Error Monitoring & Analytics

### Logging Error Metrics

```typescript
// errorTracking.ts

import * as Sentry from '@sentry/browser';
import { ContractError } from './errors';

export class ErrorTracker {
  static trackContractError(error: ContractError, context?: any) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Contract Error:', {
        code: error.code,
        type: error.contractType,
        message: error.userMessage,
        context,
      });
    }
    
    // Send to Sentry
    Sentry.captureException(error, {
      tags: {
        error_code: error.code,
        contract_type: error.contractType,
        retryable: error.isRetryable(),
      },
      extra: {
        technical_details: error.technicalDetails,
        context,
      },
    });
    
    // Send to custom analytics
    this.sendToAnalytics({
      event: 'contract_error',
      properties: {
        error_code: error.code,
        contract_type: error.contractType,
        error_message: error.userMessage,
        timestamp: new Date().toISOString(),
      },
    });
  }
  
  private static sendToAnalytics(data: any) {
    // Send to your analytics platform
    // e.g., Mixpanel, Amplitude, etc.
  }
}
```

## Testing Error Handling

```typescript
// escrowClient.test.ts

import { describe, it, expect, jest } from '@jest/globals';
import { EscrowClient } from './escrowClient';
import { ContractError, EscrowError } from './errors';

describe('EscrowClient Error Handling', () => {
  it('should throw ContractError for invalid nonce', async () => {
    const mockContract = {
      call: jest.fn().mockResolvedValue({
        isErr: () => true,
        error: { code: EscrowError.INVALID_NONCE }
      })
    };
    
    const client = new EscrowClient(mockContract as any, {} as any);
    
    await expect(
      client.createEscrow({
        propertyId: 1,
        amount: 1000n,
        buyer: 'buyer_addr',
        seller: 'seller_addr',
        participants: [],
        requiredSignatures: 2,
        nonce: 999, // Wrong nonce
      })
    ).rejects.toThrow(ContractError);
    
    try {
      await client.createEscrow({...});
    } catch (error) {
      expect(error).toBeInstanceOf(ContractError);
      expect(error.code).toBe(EscrowError.INVALID_NONCE);
      expect(error.userMessage).toContain('nonce');
    }
  });
  
  it('should identify retryable errors', async () => {
    const timeLockError = new ContractError(
      EscrowError.TIME_LOCK_ACTIVE,
      'escrow',
      'Time lock is active',
    );
    
    expect(timeLockError.isRetryable()).toBe(true);
    
    const unauthorizedError = new ContractError(
      EscrowError.UNAUTHORIZED,
      'escrow',
      'Unauthorized',
    );
    
    expect(unauthorizedError.isRetryable()).toBe(false);
  });
});
```

## Backward Compatibility Strategy

### Version Detection

```typescript
// versionDetection.ts

export async function detectContractVersion(
  contract: Contract
): Promise<'v1' | 'v2'> {
  try {
    // Try calling a v2-specific method
    const result = await contract.call('version');
    if (result >= 2) {
      return 'v2';
    }
  } catch {
    // Fall back to v1
  }
  return 'v1';
}

// Adapter pattern for dual support
export class EscrowClientAdapter {
  constructor(
    private contract: Contract,
    private version: 'v1' | 'v2'
  ) {}
  
  async createEscrow(params: any): Promise<number> {
    if (this.version === 'v2') {
      // Use new error handling
      return this.createEscrowV2(params);
    } else {
      // Use old string-based error handling
      return this.createEscrowV1(params);
    }
  }
  
  private async createEscrowV2(params: any): Promise<number> {
    // Result<T, Error> handling
    const result = await this.contract.call('create_escrow_advanced', ...);
    if (result.isErr()) {
      throw ContractError.fromSorobanError(result.error, 'escrow');
    }
    return result.unwrap();
  }
  
  private async createEscrowV1(params: any): Promise<number> {
    // String panic handling
    try {
      return await this.contract.call('create_escrow_advanced', ...);
    } catch (error) {
      // Parse panic string message
      throw new Error(error.message);
    }
  }
}
```

## Migration Checklist

### For SDK Developers

- [ ] Create error enum definitions matching Rust contracts
- [ ] Implement ContractError wrapper class
- [ ] Update all contract method calls to handle Result types
- [ ] Add user-friendly error messages
- [ ] Implement error tracking/logging
- [ ] Add retry logic for transient errors
- [ ] Create error display components
- [ ] Write tests for error scenarios
- [ ] Update API documentation
- [ ] Deploy with version detection for backward compatibility

### For API Developers

- [ ] Map Soroban error codes to HTTP status codes
- [ ] Create structured error response format
- [ ] Add error code documentation to OpenAPI/Swagger
- [ ] Implement error logging middleware
- [ ] Add retry headers for transient errors
- [ ] Update client SDKs with new error types

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-07-17  
**Authors**: PropChain Development Team
