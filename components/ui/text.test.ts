import { describe, it, expect } from 'vitest';
import { truncateMiddle } from '@/utils/text';

describe('utils/text', () => {
  describe('truncateMiddle', () => {
    it('should truncate a long string in the middle', () => {
      const longString = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
      expect(truncateMiddle(longString, 4)).toBe('GABC...7890');
    });

    it('should not truncate a short string', () => {
      const shortString = 'GABCWXYZ';
      expect(truncateMiddle(shortString, 4)).toBe('GABCWXYZ');
    });

    it('should handle custom character counts', () => {
      const longString = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
      expect(truncateMiddle(longString, 6)).toBe('GABCDE...567890');
    });
  });
});