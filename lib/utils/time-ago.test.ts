import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatLastSynced } from './time-ago';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formatLastSynced', () => {
  it('returns "Updated just now" for timestamps less than 1 minute ago', () => {
    expect(formatLastSynced('2026-07-24T11:59:31Z')).toBe('Updated just now');
  });

  it('returns "Updated just now" for timestamps just a few seconds ago', () => {
    expect(formatLastSynced('2026-07-24T11:59:58Z')).toBe('Updated just now');
  });

  it('returns "Updated 1 min ago" for timestamps 1 minute ago', () => {
    expect(formatLastSynced('2026-07-24T11:59:00Z')).toBe('Updated 1 min ago');
  });

  it('returns "Updated 5 min ago" for timestamps 5 minutes ago', () => {
    expect(formatLastSynced('2026-07-24T11:55:00Z')).toBe('Updated 5 min ago');
  });

  it('returns "Updated 59 min ago" for timestamps 59 minutes ago', () => {
    expect(formatLastSynced('2026-07-24T11:01:00Z')).toBe('Updated 59 min ago');
  });

  it('returns "Updated 1 hour ago" for timestamps 1 hour ago', () => {
    expect(formatLastSynced('2026-07-24T11:00:00Z')).toBe('Updated 1 hour ago');
  });

  it('returns "Updated 2 hours ago" for timestamps 2 hours ago', () => {
    expect(formatLastSynced('2026-07-24T10:00:00Z')).toBe('Updated 2 hours ago');
  });

  it('returns an absolute date for timestamps older than 24 hours', () => {
    expect(formatLastSynced('2026-07-23T11:00:00Z')).toMatch(/^Updated /);
    expect(formatLastSynced('2026-07-23T11:00:00Z')).not.toContain('ago');
  });

  it('returns a locale-aware absolute date for old timestamps with es locale', () => {
    const result = formatLastSynced('2026-07-23T11:00:00Z', 'es');
    expect(result).toMatch(/^Updated /);
    expect(result).not.toContain('ago');
  });

  it('returns empty string for null input', () => {
    expect(formatLastSynced(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(formatLastSynced(undefined)).toBe('');
  });

  it('returns empty string for invalid date strings', () => {
    expect(formatLastSynced('not-a-date')).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(formatLastSynced('')).toBe('');
  });
});
