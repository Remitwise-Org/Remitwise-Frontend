/**
 * Tests for sanitization utilities
 * Ensures sensitive data is properly redacted or masked in logs
 */

import { describe, it, expect } from 'vitest';
import { sanitizeObject, sanitizeString } from '@/lib/sanitize';

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
});
