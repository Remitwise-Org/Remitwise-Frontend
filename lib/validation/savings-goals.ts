// Validation utilities for savings goals

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that an amount is a positive number
 */
export function validateAmount(amount: number): ValidationResult {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return { isValid: false, error: 'goal_amount_positive' };
  }
  
  if (amount <= 0) {
    return { isValid: false, error: 'goal_amount_positive' };
  }
  
  return { isValid: true };
}

/**
 * Validates that a date string is in the future
 */
export function validateFutureDate(dateString: string): ValidationResult {
  if (!dateString || typeof dateString !== 'string') {
    return { isValid: false, error: 'goal_invalid_date' };
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'goal_invalid_date' };
  }
  
  const now = new Date();
  
  if (date <= now) {
    return { isValid: false, error: 'goal_date_future' };
  }
  
  return { isValid: true };
}

/**
 * Validates that a goal ID is non-empty
 */
export function validateGoalId(goalId: string): ValidationResult {
  if (!goalId || typeof goalId !== 'string' || goalId.trim().length === 0) {
    return { isValid: false, error: 'goal_id_required' };
  }
  
  return { isValid: true };
}

/**
 * Validates that a goal name is valid
 */
export function validateGoalName(name: string): ValidationResult {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { isValid: false, error: 'goal_name_required' };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'goal_name_too_long' };
  }
  
  return { isValid: true };
}

/**
 * Validates that a goal description is valid
 */
export function validateGoalDescription(description: string): ValidationResult {
  if (typeof description !== 'string') {
    return { isValid: false, error: 'goal_description_invalid' };
  }
  
  if (description.length > 200) {
    return { isValid: false, error: 'goal_description_too_long' };
  }
  
  return { isValid: true };
}

/**
 * Validates a Stellar public key format
 */
export function validatePublicKey(publicKey: string): ValidationResult {
  if (!publicKey || typeof publicKey !== 'string') {
    return { isValid: false, error: 'Public key must be a non-empty string' };
  }
  
  // Basic validation: Stellar public keys start with 'G' and are 56 characters
  if (!publicKey.startsWith('G') || publicKey.length !== 56) {
    return { isValid: false, error: 'Invalid Stellar public key format' };
  }
  
  return { isValid: true };
}
