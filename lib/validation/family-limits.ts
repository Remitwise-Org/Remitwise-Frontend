// Validation utilities for family spending limits

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that a spending limit is a non-negative, finite number
 */
export function validateSpendingLimit(limit: number): ValidationResult {
  if (typeof limit !== 'number' || isNaN(limit) || !isFinite(limit)) {
    return { isValid: false, error: 'Limit must be a valid number' };
  }
  
  if (limit < 0) {
    return { isValid: false, error: 'Limit must be non-negative' };
  }
  
  return { isValid: true };
}
