import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { truncateMiddle } from '../../../utils/text';

describe('truncateMiddle', () => {
  it('preserves the correct start and end for strings longer than double the charsToShow', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 9 }),
        fc.integer({ min: 1, max: 4 }),
        (str, charsToShow) => {
          // ensure the string is long enough to be truncated
          fc.pre(str.length > charsToShow * 2);

          const result = truncateMiddle(str, charsToShow);
          const start = str.substring(0, charsToShow);
          const end = str.substring(str.length - charsToShow);

          expect(result).toBe(`${start}...${end}`);
          expect(result.length).toBe(charsToShow * 2 + 3); // 3 is for '...'
        }
      )
    );
  });

  it('returns the original string when its length is less than or equal to double the charsToShow', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer({ min: 1, max: 10 }),
        (str, charsToShow) => {
          fc.pre(str.length <= charsToShow * 2);

          const result = truncateMiddle(str, charsToShow);
          expect(result).toBe(str);
        }
      )
    );
  });

  it('uses default charsToShow as 4', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 9 }),
        (str) => {
          const result = truncateMiddle(str);
          const start = str.substring(0, 4);
          const end = str.substring(str.length - 4);
          expect(result).toBe(`${start}...${end}`);
        }
      )
    );
  });

  it('returns empty string if input is empty', () => {
    expect(truncateMiddle('')).toBe('');
  });

  it('returns original string when charsToShow is 0 and string is empty', () => {
    expect(truncateMiddle('', 0)).toBe('');
  });
  
  it('truncates correctly with explicit sad path where charsToShow is 0 and string is long', () => {
    expect(truncateMiddle('AABB', 0)).toBe('...');
  });
});
