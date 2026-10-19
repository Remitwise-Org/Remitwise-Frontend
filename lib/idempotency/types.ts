/**
 * Idempotency Types
 * 
 * Types for idempotency key management to prevent duplicate operations
 */

export interface IdempotencyRecord {
    key: string;
    requestHash: string;
    response: {
        status: number;
        body: any;
        headers?: Record<string, string>;
    };
    createdAt: number;
    expiresAt: number;
}

export interface IdempotencyCheckResult {
    exists: boolean;
    record?: IdempotencyRecord;
    conflict: boolean;
}
