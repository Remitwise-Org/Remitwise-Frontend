/**
 * Tests for sanitization utilities
 * Ensures sensitive data is properly redacted or masked in logs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeObject, sanitizeString } from '@/lib/sanitize';
import { logResponse, logDebug } from '@/lib/logger';

describe('sanitizeObject', () => {
  it('redacts password field', () => {
    const result = sanitizeObject({ password: 'secret123' });
    expect(result).toEqual({ password: '[REDACTED]' });
  });

  it('redacts nested sensitive fields', () => {
    const result = sanitizeObject({
      user: { password: 'x', name: 'Alice' },
    });
    expect(result).toEqual({
      user: { password: '[REDACTED]', name: 'Alice' },
    });
  });

  it('partially masks email', () => {
    const result = sanitizeObject({ email: 'user@example.com' });
    expect(result.email).toBe('us***@***');
  });

  it('partially masks wallet address', () => {
    const result = sanitizeObject({
      address: 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    });
    expect(result.address).toBe('GBXXXX***');
  });

  it('leaves safe fields unchanged', () => {
    const result = sanitizeObject({
      amount: 100,
      currency: 'USD',
      status: 'pending',
    });
    expect(result).toEqual({
      amount: 100,
      currency: 'USD',
      status: 'pending',
    });
  });

  it('handles null and undefined gracefully', () => {
    const result = sanitizeObject({ amount: null, name: undefined });
    expect(result).toEqual({ amount: null, name: undefined });
  });

  it('does not recurse beyond depth 5', () => {
    // Construct a 6-level deep object
    const deepObject = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  secret: 'should be truncated',
                },
              },
            },
          },
        },
      },
    };

    const result = sanitizeObject(deepObject);

    // Navigate to level 5 and verify level 6 is truncated
    expect(result.level1.level2.level3.level4.level5).toBe('[TRUNCATED]');
  });

  it('redacts multiple sensitive fields', () => {
    const result = sanitizeObject({
      password: 'pass123',
      apiKey: 'key456',
      token: 'token789',
      name: 'John',
    });

    expect(result).toEqual({
      password: '[REDACTED]',
      apiKey: '[REDACTED]',
      token: '[REDACTED]',
      name: 'John',
    });
  });

  it('handles arrays of objects', () => {
    const result = sanitizeObject({
      users: [
        { name: 'Alice', password: 'secret1' },
        { name: 'Bob', password: 'secret2' },
      ],
    });

    expect(result).toEqual({
      users: [
        { name: 'Alice', password: '[REDACTED]' },
        { name: 'Bob', password: '[REDACTED]' },
      ],
    });
  });

  it('masks phone numbers', () => {
    const result = sanitizeObject({ phone: '+1234567890' });
    expect(result.phone).toBe('+12***7890');
  });

  it('masks public keys', () => {
    const result = sanitizeObject({
      publicKey: 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    });
    expect(result.publicKey).toBe('GBXXXX***');
  });

  it('handles case-insensitive field names', () => {
    const result = sanitizeObject({
      PASSWORD: 'secret',
      ApiKey: 'key123',
      Token: 'token456',
    });

    expect(result).toEqual({
      PASSWORD: '[REDACTED]',
      ApiKey: '[REDACTED]',
      Token: '[REDACTED]',
    });
  });

  it('preserves non-string values in partial mask fields', () => {
    const result = sanitizeObject({
      email: 123,
      address: null,
      phone: undefined,
    });

    expect(result).toEqual({
      email: 123,
      address: null,
      phone: undefined,
    });
  });

  it('handles empty objects', () => {
    const result = sanitizeObject({});
    expect(result).toEqual({});
  });

  it('handles deeply nested arrays', () => {
    const result = sanitizeObject({
      data: [
        [
          { password: 'secret' },
        ],
      ],
    });

    expect(result.data[0][0]).toEqual({ password: '[REDACTED]' });
  });

  it('masks wallet_address with underscore', () => {
    const result = sanitizeObject({
      wallet_address: 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    });
    expect(result.wallet_address).toBe('GBXXXX***');
  });

  it('redacts refreshToken', () => {
    const result = sanitizeObject({ refreshToken: 'token123' });
    expect(result).toEqual({ refreshToken: '[REDACTED]' });
  });

  it('redacts refresh_token', () => {
    const result = sanitizeObject({ refresh_token: 'token123' });
    expect(result).toEqual({ refresh_token: '[REDACTED]' });
  });

  it('redacts accessToken', () => {
    const result = sanitizeObject({ accessToken: 'token123' });
    expect(result).toEqual({ accessToken: '[REDACTED]' });
  });

  it('redacts access_token', () => {
    const result = sanitizeObject({ access_token: 'token123' });
    expect(result).toEqual({ access_token: '[REDACTED]' });
  });

  it('redacts creditCard', () => {
    const result = sanitizeObject({ creditCard: '4111111111111111' });
    expect(result).toEqual({ creditCard: '[REDACTED]' });
  });

  it('redacts credit_card', () => {
    const result = sanitizeObject({ credit_card: '4111111111111111' });
    expect(result).toEqual({ credit_card: '[REDACTED]' });
  });

  it('redacts ssn', () => {
    const result = sanitizeObject({ ssn: '123-45-6789' });
    expect(result).toEqual({ ssn: '[REDACTED]' });
  });

  it('redacts pin', () => {
    const result = sanitizeObject({ pin: '1234' });
    expect(result).toEqual({ pin: '[REDACTED]' });
  });

  it('handles mixed sensitive and safe fields in nested objects', () => {
    const result = sanitizeObject({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        password: 'secret',
        profile: {
          name: 'John',
          apiKey: 'key123',
        },
      },
    });

    expect(result).toEqual({
      user: {
        id: 'user-123',
        email: 'te***@***',
        password: '[REDACTED]',
        profile: {
          name: 'John',
          apiKey: '[REDACTED]',
        },
      },
    });
  });
});

describe('sanitizeString', () => {
  it('masks api_key patterns', () => {
    const result = sanitizeString('api_key=secret123');
    expect(result).toBe('api_key=[REDACTED]');
  });

  it('masks token patterns', () => {
    const result = sanitizeString('token=abc123def456');
    expect(result).toBe('token=[REDACTED]');
  });

  it('masks password patterns', () => {
    const result = sanitizeString('password=mypassword');
    expect(result).toBe('password=[REDACTED]');
  });

  it('masks Bearer tokens', () => {
    const result = sanitizeString('Authorization: Bearer eyJhbGc...');
    expect(result).toContain('Bearer [REDACTED]');
  });

  it('preserves non-sensitive strings', () => {
    const result = sanitizeString('This is a normal log message');
    expect(result).toBe('This is a normal log message');
  });

  it('handles multiple sensitive patterns', () => {
    const result = sanitizeString(
      'api_key=key123 and password=pass456 and token=tok789'
    );
    expect(result).toContain('api_key=[REDACTED]');
    expect(result).toContain('password=[REDACTED]');
    expect(result).toContain('token=[REDACTED]');
  });

  it('masks secret embedded mid-sentence, preserving surrounding text', () => {
    const result = sanitizeString('request failed: Bearer eyJhbGciOiJSUzI1NiJ9.payload status=401');
    expect(result).toContain('Bearer [REDACTED]');
    expect(result).not.toContain('eyJhbGciOiJSUzI1NiJ9');
    expect(result).toContain('status=401');
  });

  it('returns non-string input unchanged', () => {
    expect(sanitizeString(undefined as any)).toBeUndefined();
    expect(sanitizeString(42 as any)).toBe(42);
    expect(sanitizeString(null as any)).toBeNull();
  });

  it('handles empty string without throwing', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('handles api-key with dash separator', () => {
    const result = sanitizeString('api-key=supersecret123');
    expect(result).toContain('api_key=[REDACTED]');
  });
});

describe('sanitizeObject — non-object primitive inputs', () => {
  it('returns a number unchanged', () => {
    expect(sanitizeObject(42)).toBe(42);
  });

  it('returns a string unchanged', () => {
    expect(sanitizeObject('hello')).toBe('hello');
  });

  it('returns a boolean unchanged', () => {
    expect(sanitizeObject(true)).toBe(true);
  });
});

describe('logger integration — sanitization routing', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    delete process.env.LOG_LEVEL;
  });

  it('logResponse redacts sensitive fields in response data', () => {
    process.env.LOG_LEVEL = 'info';
    logResponse('req-001', 'POST', '/api/login', 200, 12, {
      userId: 'u-1',
      password: 'super-secret',
      token: 'eyJhbGc...',
    });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.data.password).toBe('[REDACTED]');
    expect(logged.data.token).toBe('[REDACTED]');
    expect(logged.data.userId).toBe('u-1');
  });

  it('logResponse omits data field when responseData is not provided', () => {
    process.env.LOG_LEVEL = 'info';
    logResponse('req-002', 'GET', '/api/health', 200, 5);

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.data).toBeUndefined();
  });

  it('logDebug sanitizes sensitive patterns in the message string', () => {
    process.env.LOG_LEVEL = 'debug';
    logDebug('req-003', 'auth handler token=eyJhbGciOiJSUzI1NiJ9 processed', undefined);

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.message).toContain('token=[REDACTED]');
    expect(logged.message).not.toContain('eyJhbGciOiJSUzI1NiJ9');
  });

  it('logDebug sanitizes sensitive fields in data', () => {
    process.env.LOG_LEVEL = 'debug';
    logDebug('req-004', 'user context', { userId: 'u-2', apiKey: 'key-xyz' });

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.data.apiKey).toBe('[REDACTED]');
    expect(logged.data.userId).toBe('u-2');
  });
});
