/**
 * Cached wrapper for insurance contract
 * 
 * Production-grade wrapper with comprehensive error handling and type safety.
 * All write operations (buildXxxTx) are NOT cached.
 * 
 * @module lib/contracts/insurance-cached
 * @security Input validation, error boundaries, type safety
 */

import { cachedContractCall, CONTRACT_IDS, CACHE_TTL, CacheError } from '@/lib/cache/contract-cache';
import * as originalContract from './insurance';

// Stellar address validation regex
const STELLAR_ADDRESS_REGEX = /^G[A-Z0-9]{55}$/;

/**
 * Validates Stellar address format
 * @security Prevents injection attacks and invalid queries
 */
function validateStellarAddress(address: string, paramName: string): void {
  if (!address || typeof address !== 'string') {
    throw new Error(`${paramName} must be a non-empty string`);
  }

  if (!STELLAR_ADDRESS_REGEX.test(address)) {
    throw new Error(
      `${paramName} must be a valid Stellar address (G followed by 55 alphanumeric characters)`
    );
  }
}

/**
 * Validates policy ID format
 * @security Prevents injection attacks
 */
function validatePolicyId(id: string): void {
  if (!id || typeof id !== 'string') {
    throw new Error('Policy ID must be a non-empty string');
  }

  // Policy IDs should be alphanumeric with hyphens/underscores only
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Policy ID contains invalid characters');
  }

  // Reasonable length limit
  if (id.length > 128) {
    throw new Error('Policy ID exceeds maximum length of 128 characters');
  }
}

/**
 * Get a single policy by ID with caching and validation
 * 
 * @param id - Policy identifier (alphanumeric with hyphens/underscores)
 * @returns Policy object
 * @throws Error with code 'NOT_FOUND' if policy doesn't exist
 * @throws CacheError for validation failures
 * @throws Error for RPC failures
 * 
 * TTL: 45 seconds - Individual policy data is relatively stable
 */
export async function getPolicy(id: string): Promise<originalContract.Policy> {
  // Validate policy ID
  validatePolicyId(id);

  try {
    return await cachedContractCall(
      CONTRACT_IDS.INSURANCE,
      'getPolicy',
      { id },
      CACHE_TTL.getPolicy,
      async () => await originalContract.getPolicy(id)
    );
  } catch (error) {
    // Preserve NOT_FOUND errors from original contract
    if (error instanceof Error && 'code' in error && error.code === 'NOT_FOUND') {
      throw error;
    }
    // Re-throw CacheError as-is
    if (error instanceof CacheError) {
      throw error;
    }
    // Wrap other errors with context
    throw new Error(
      `Failed to get policy: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}

/**
 * Get all active policies for an owner with caching and validation
 * 
 * @param owner - Stellar address (G followed by 55 alphanumeric characters)
 * @returns Array of active policies (empty array if none found)
 * @throws Error for invalid Stellar address
 * @throws CacheError for validation failures
 * @throws Error for RPC failures
 * 
 * TTL: 45 seconds - Insurance policies are relatively stable
 */
export async function getActivePolicies(owner: string): Promise<originalContract.Policy[]> {
  // Validate Stellar address
  validateStellarAddress(owner, 'owner');

  try {
    return await cachedContractCall(
      CONTRACT_IDS.INSURANCE,
      'getActivePolicies',
      { owner },
      CACHE_TTL.getActivePolicies,
      async () => await originalContract.getActivePolicies(owner)
    );
  } catch (error) {
    // Preserve INVALID_ADDRESS errors from original contract
    if (error instanceof Error && 'code' in error && error.code === 'INVALID_ADDRESS') {
      throw error;
    }
    // Re-throw CacheError as-is
    if (error instanceof CacheError) {
      throw error;
    }
    // Wrap other errors with context
    throw new Error(
      `Failed to get active policies: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}

/**
 * Get total monthly premium for an owner with caching and validation
 * 
 * @param owner - Stellar address (G followed by 55 alphanumeric characters)
 * @returns Total monthly premium as a number
 * @throws Error for invalid Stellar address
 * @throws CacheError for validation failures
 * @throws Error for RPC failures
 * 
 * TTL: 45 seconds - Derived from policies, relatively stable
 */
export async function getTotalMonthlyPremium(owner: string): Promise<number> {
  // Validate Stellar address
  validateStellarAddress(owner, 'owner');

  try {
    const result = await cachedContractCall(
      CONTRACT_IDS.INSURANCE,
      'getTotalMonthlyPremium',
      { owner },
      CACHE_TTL.getTotalMonthlyPremium,
      async () => await originalContract.getTotalMonthlyPremium(owner)
    );

    // Validate result is a valid number
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Invalid premium value returned from contract');
    }

    if (result < 0) {
      throw new Error('Premium cannot be negative');
    }

    return result;
  } catch (error) {
    // Preserve INVALID_ADDRESS errors from original contract
    if (error instanceof Error && 'code' in error && error.code === 'INVALID_ADDRESS') {
      throw error;
    }
    // Re-throw CacheError as-is
    if (error instanceof CacheError) {
      throw error;
    }
    // Wrap other errors with context
    throw new Error(
      `Failed to get total monthly premium: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}

// Re-export types for convenience
export type { Policy } from './insurance';
