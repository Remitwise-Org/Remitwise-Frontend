import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validatePaginationParams,
  createPaginatedResponse,
  paginateData,
} from '@/lib/utils/pagination';

describe('validatePaginationParams', () => {
  it('defaults limit to 20 when not provided', () => {
    expect(validatePaginationParams({}).limit).toBe(20);
  });

  it('defaults limit to 20 when undefined', () => {
    expect(validatePaginationParams({ limit: undefined }).limit).toBe(20);
  });

  it('clamps limit of 0 up to 1', () => {
    expect(validatePaginationParams({ limit: 0 }).limit).toBe(1);
  });

  it('clamps negative limit up to 1', () => {
    expect(validatePaginationParams({ limit: -50 }).limit).toBe(1);
  });

  it('accepts limit of 1', () => {
    expect(validatePaginationParams({ limit: 1 }).limit).toBe(1);
  });

  it('accepts limit of 100', () => {
    expect(validatePaginationParams({ limit: 100 }).limit).toBe(100);
  });

  it('clamps limit of 101 down to 100', () => {
    expect(validatePaginationParams({ limit: 101 }).limit).toBe(100);
  });

  it('clamps very large limit down to 100', () => {
    expect(validatePaginationParams({ limit: 9999 }).limit).toBe(100);
  });

  it('passes cursor through unchanged', () => {
    const { cursor } = validatePaginationParams({ cursor: 'cursor-abc' });
    expect(cursor).toBe('cursor-abc');
  });

  it('passes undefined cursor through', () => {
    const { cursor } = validatePaginationParams({});
    expect(cursor).toBeUndefined();
  });
});

describe('createPaginatedResponse', () => {
  const getId = (item: { id: string }) => item.id;

  it('sets hasMore true when hasNextPage is true', () => {
    const data = [{ id: 'a' }, { id: 'b' }];
    const result = createPaginatedResponse(data, 2, true, getId);
    expect(result.hasMore).toBe(true);
  });

  it('sets hasMore false when hasNextPage is false', () => {
    const data = [{ id: 'a' }];
    const result = createPaginatedResponse(data, 5, false, getId);
    expect(result.hasMore).toBe(false);
  });

  it('sets nextCursor to last item id when data is non-empty and getId provided', () => {
    const data = [{ id: 'x' }, { id: 'y' }, { id: 'z' }];
    const result = createPaginatedResponse(data, 3, true, getId);
    expect(result.nextCursor).toBe('z');
  });

  it('does not set nextCursor when data is empty', () => {
    const result = createPaginatedResponse([], 10, false, getId);
    expect(result.nextCursor).toBeUndefined();
  });

  it('does not set nextCursor when getId is not provided', () => {
    const data = [{ id: 'a' }];
    const result = createPaginatedResponse(data, 1, true);
    expect(result.nextCursor).toBeUndefined();
  });

  it('returns data unchanged', () => {
    const data = [{ id: 'p' }, { id: 'q' }];
    const result = createPaginatedResponse(data, 2, false, getId);
    expect(result.data).toEqual(data);
  });
});

describe('paginateData', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i + 1) }));
  const getId = (item: { id: string }) => item.id;

  it('returns first page when no cursor given', () => {
    const result = paginateData(items, 3, getId);
    expect(result.data).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('3');
  });

  it('returns correct slice after a cursor', () => {
    const result = paginateData(items, 3, getId, '3');
    expect(result.data).toEqual([{ id: '4' }, { id: '5' }, { id: '6' }]);
    expect(result.hasMore).toBe(true);
  });

  it('sets hasMore false on last page', () => {
    const result = paginateData(items, 3, getId, '9');
    expect(result.data).toEqual([{ id: '10' }]);
    expect(result.hasMore).toBe(false);
  });

  it('returns empty data and hasMore false when cursor is last item', () => {
    const result = paginateData(items, 5, getId, '10');
    expect(result.data).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it('returns all items when limit exceeds total', () => {
    const result = paginateData(items, 100, getId);
    expect(result.data).toHaveLength(10);
    expect(result.hasMore).toBe(false);
  });

  it('returns empty result on empty dataset', () => {
    const result = paginateData([], 5, getId);
    expect(result.data).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it('ignores unknown cursor and starts from beginning', () => {
    const result = paginateData(items, 3, getId, 'unknown-cursor');
    expect(result.data).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });
});

describe('validatePaginationParams — property tests', () => {
  it('limit is always clamped to [1, 100]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000, max: 10000 }),
        (rawLimit) => {
          const { limit } = validatePaginationParams({ limit: rawLimit });
          return limit >= 1 && limit <= 100;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('cursor always passes through unchanged', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (rawCursor) => {
          const { cursor } = validatePaginationParams({ cursor: rawCursor });
          return cursor === rawCursor;
        }
      ),
      { numRuns: 100 }
    );
  });
});
