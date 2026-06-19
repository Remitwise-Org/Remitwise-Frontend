import { validateSpendingLimit } from './family-limits';

describe('validateSpendingLimit', () => {
  it('should return isValid: true for valid positive numbers', () => {
    expect(validateSpendingLimit(100).isValid).toBe(true);
    expect(validateSpendingLimit(0.01).isValid).toBe(true);
  });

  it('should return isValid: true for 0', () => {
    expect(validateSpendingLimit(0).isValid).toBe(true);
  });

  it('should return isValid: false for negative numbers', () => {
    const result = validateSpendingLimit(-100);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Limit must be non-negative');
  });

  it('should return isValid: false for non-numeric values', () => {
    // @ts-ignore
    expect(validateSpendingLimit('100').isValid).toBe(false);
    // @ts-ignore
    expect(validateSpendingLimit(NaN).isValid).toBe(false);
  });
});
