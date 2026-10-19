/**
 * Cached wrapper for remittance-split contract
 * 
 * Production-grade wrapper with comprehensive error handling and type safety.
 * All write operations (buildXxxTx) are NOT cached.
 * 
 * @module lib/contracts/remittance-split-cached
 * @security Input validation, error boundaries, type safety
 */

import { cachedContractCall, CONTRACT_IDS, CACHE_TTL, CacheError } from '@/lib/cache/contract-cache';
import * as originalContract from './remittance-split';

/**
 * Get split configuration with caching and error handling
 * 
 * @param env - Network environment ('testnet' | 'mainnet')
 * @returns Split configuration or null if not found
 * @throws CacheError for validation failures
 * @throws Error for RPC failures
 * 
 * TTL: 60 seconds - Configuration changes infrequently
 */
export async function getSplit(env: 'testnet' | 'mainnet' = 'testnet'): Promise<originalContract.SplitConfig | null> {
  // Validate environment parameter
  if (env !== 'testnet' && env !== 'mainnet') {
    throw new Error(`Invalid environment: ${env}. Must be 'testnet' or 'mainnet'`);
  }

  try {
    return await cachedContractCall(
      CONTRACT_IDS.REMITTANCE_SPLIT,
      'getSplit',
      { env },
      CACHE_TTL.getSplit,
      async () => await originalContract.getSplit(env)
    );
  } catch (error) {
    // Re-throw CacheError as-is for proper error handling upstream
    if (error instanceof CacheError) {
      throw error;
    }
    // Wrap other errors with context
    throw new Error(
      `Failed to get split configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}

/**
 * Get config (alias for getSplit) with caching and error handling
 * 
 * @param env - Network environment ('testnet' | 'mainnet')
 * @returns Split configuration or null if not found
 * @throws CacheError for validation failures
 * @throws Error for RPC failures
 * 
 * TTL: 60 seconds - Configuration changes infrequently
 */
export async function getConfig(env: 'testnet' | 'mainnet' = 'testnet'): Promise<originalContract.SplitConfig | null> {
  // Validate environment parameter
  if (env !== 'testnet' && env !== 'mainnet') {
    throw new Error(`Invalid environment: ${env}. Must be 'testnet' or 'mainnet'`);
  }

  try {
    return await cachedContractCall(
      CONTRACT_IDS.REMITTANCE_SPLIT,
      'getConfig',
      { env },
      CACHE_TTL.getConfig,
      async () => await originalContract.getConfig(env)
    );
  } catch (error) {
    if (error instanceof CacheError) {
      throw error;
    }
    throw new Error(
      `Failed to get config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}

/**
 * Calculate split with caching and validation
 * 
 * @param amount - Amount to split (must be positive integer)
 * @param env - Network environment ('testnet' | 'mainnet')
 * @returns Split amounts or null if config not found
 * @throws Error for invalid amount or RPC failures
 * 
 * Note: This uses getSplit internally which is already cached.
 * We cache the calculation result separately for the specific amount.
 * 
 * TTL: 60 seconds - Uses same TTL as getSplit
 */
export async function calculateSplit(
  amount: number,
  env: 'testnet' | 'mainnet' = 'testnet'
): Promise<originalContract.SplitAmounts | null> {
  // Validate amount parameter
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error(`Invalid amount: ${amount}. Must be a finite number`);
  }

  if (amount < 0) {
    throw new Error(`Invalid amount: ${amount}. Must be non-negative`);
  }

  if (!Number.isInteger(amount)) {
    throw new Error(`Invalid amount: ${amount}. Must be an integer`);
  }

  // Validate environment parameter
  if (env !== 'testnet' && env !== 'mainnet') {
    throw new Error(`Invalid environment: ${env}. Must be 'testnet' or 'mainnet'`);
  }

  try {
    // calculateSplit depends on getSplit, which is already cached
    // We cache the calculation result separately for the specific amount
    return await cachedContractCall(
      CONTRACT_IDS.REMITTANCE_SPLIT,
      'calculateSplit',
      { amount, env },
      CACHE_TTL.getSplit, // Use same TTL as getSplit
      async () => await originalContract.calculateSplit(amount, env)
    );
  } catch (error) {
    if (error instanceof CacheError) {
      throw error;
    }
    throw new Error(
      `Failed to calculate split: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}

// Re-export types for convenience
export type { SplitConfig, SplitAmounts } from './remittance-split';
