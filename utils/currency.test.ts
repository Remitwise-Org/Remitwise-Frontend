import { formatCurrency } from '../currency';

describe('formatCurrency Utility Spec', () => {
  
  // Test Category A: Locale-specific thousand separators
  describe('Locale & Thousand Separators', () => {
    it('should format numbers with correct thousand separators for US locale', () => {
      const result = formatCurrency(1234567.89, { locale: 'en-US', currency: 'USD' });
      // Using regex to allow flex for non-breaking spaces vs standard spaces
      expect(result).toMatch(/1,234,567\.89/);
    });

    it('should format numbers with correct space or dot separators for European locales', () => {
      const result = formatCurrency(1234567.89, { locale: 'fr-FR', currency: 'EUR' });
      // French uses spaces as thousand separators
      expect(result).toMatch(/1\s234\s567[,.]89/);
    });
  });

  // Test Category B: Rounding Modes
  describe('Rounding Modes', () => {
    it('should round up correctly on boundary conditions according to standard accounting rules', () => {
      const result = formatCurrency(10.556, { minDecimalPlaces: 2, maxDecimalPlaces: 2 });
      expect(result).toContain('10.56');
    });

    it('should round down accurately without floating point precision side-effects', () => {
      const result = formatCurrency(10.554, { minDecimalPlaces: 2, maxDecimalPlaces: 2 });
      expect(result).toContain('10.55');
    });
  });

  // Test Category C: Trailing-Zero Stripping
  describe('Trailing-Zero Stripping', () => {
    it('should strip out trailing zeros when stripZeros option flag is enabled', () => {
      const result = formatCurrency(120.5000, { stripZeros: true, maxDecimalPlaces: 4 });
      expect(result).not.toMatch(/\.5000$/);
      expect(result).toContain('120.5');
    });

    it('should return whole integers without trailing decimal matrix symbols if value is an integer and zero-strip is on', () => {
      const result = formatCurrency(500.00, { stripZeros: true });
      expect(result).not.toContain('.00');
      expect(result).toContain('500');
    });
  });

  // Test Category D: Sad Paths / Boundary Conditions
  describe('Sad Paths and Edge Cases', () => {
    it('returns_zero_when_balance_is_zero', () => {
      const result = formatCurrency(0, { minDecimalPlaces: 2 });
      expect(result).toContain('0.00');
    });

    it('should handle negative monetary amounts cleanly with correct negative symbol placement', () => {
      const result = formatCurrency(-45.67, { locale: 'en-US' });
      expect(result).toContain('-45.67');
    });
  });
});