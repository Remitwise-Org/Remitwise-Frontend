import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDatabaseUrl } from '@/lib/db';

const originalEnv = process.env;

describe('lib/db database URL helper', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns undefined when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(getDatabaseUrl()).toBeUndefined();
  });

  it('augments the connection string with defaults when missing', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const url = getDatabaseUrl();
    expect(url).toContain('connection_limit=10');
    expect(url).toContain('connect_timeout=5');
    expect(url).toContain('pool_timeout=5');
  });

  it('does not override existing query params', () => {
    process.env.DATABASE_URL =
      'postgresql://user:pass@localhost:5432/db?connection_limit=20&connect_timeout=8';
    const url = getDatabaseUrl();
    expect(url).toContain('connection_limit=20');
    expect(url).toContain('connect_timeout=8');
    expect(url).toContain('pool_timeout=5');
  });

  it('returns original string on invalid URL parse', () => {
    process.env.DATABASE_URL = 'not-a-valid-db-url';
    expect(getDatabaseUrl()).toBe('not-a-valid-db-url');
  });
});
