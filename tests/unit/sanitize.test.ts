/**
 * Tests for sanitization utilities
 * Ensures sensitive data is properly redacted or masked in logs
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { sanitizeObject, sanitizeString } from '@/lib/sanitize';
import { logResponse } from '@/lib/logger';

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
describe('adversarial redaction coverage', () => {
  const fullyRedactedFields = [
    'password',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'privateKey',
    'private_key',
    'sessionId',
    'session_id',
    'refreshToken',
    'refresh_token',
    'accessToken',
    'access_token',
    'authorization',
    'creditCard',
    'credit_card',
    'ssn',
    'pin',
  ];

  const casingVariants = (field: string) => [
    field,
    field.toUpperCase(),
    field
      .split('')
      .map((char, index) => (index % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
      .join(''),
  ];

  it('redacts all fully redacted sensitive field names in every supported casing', () => {
    for (const field of fullyRedactedFields) {
      for (const variant of casingVariants(field)) {
        const sanitized = sanitizeObject({ [variant]: `${field}-secret-value` }) as Record<string, unknown>;

        expect(sanitized[variant]).toBe('[REDACTED]');
      }
    }
  });

  it('sanitizes deeply nested objects and arrays without changing safe fields', () => {
    const sanitized = sanitizeObject({
      status: 'ready',
      transfers: [
        {
          amount: 250,
          token: 'transfer-token',
          profile: {
            email: 'user@example.com',
            privateKey: 'stellar-private-key',
          },
        },
        {
          notes: [
            {
              session_id: 'session-secret',
              currency: 'USD',
            },
          ],
        },
      ],
    }) as {
      status: string;
      transfers: Array<{
        amount?: number;
        token?: string;
        profile?: { email: string; privateKey: string };
        notes?: Array<{ session_id: string; currency: string }>;
      }>;
    };

    expect(sanitized.status).toBe('ready');
    expect(sanitized.transfers[0].amount).toBe(250);
    expect(sanitized.transfers[0].token).toBe('[REDACTED]');
    expect(sanitized.transfers[0].profile?.email).toBe('us***@***');
    expect(sanitized.transfers[0].profile?.privateKey).toBe('[REDACTED]');
    expect(sanitized.transfers[1].notes?.[0].session_id).toBe('[REDACTED]');
    expect(sanitized.transfers[1].notes?.[0].currency).toBe('USD');
  });

  it('does not throw on circular or odd inputs and does not leak circular secrets', () => {
    const circular: Record<string, unknown> = {
      name: 'visible-name',
      token: 'circular-token',
    };
    circular.self = circular;

    expect(() => sanitizeObject(circular)).not.toThrow();

    const sanitized = sanitizeObject(circular) as Record<string, unknown>;

    expect(sanitized.name).toBe('visible-name');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(JSON.stringify(sanitized)).not.toContain('circular-token');
    expect(sanitizeObject(null)).toBeNull();
    expect(sanitizeObject(undefined)).toBeUndefined();
    expect(sanitizeObject('safe-string')).toBe('safe-string');
    expect(sanitizeObject(42)).toBe(42);
  });

  it('masks inline secrets while preserving surrounding log text', () => {
    const sanitized = sanitizeString(
      'before token=inline-token middle password=inline-password after Bearer inline-bearer-token done',
    );

    expect(sanitized).toContain('before');
    expect(sanitized).toContain('middle');
    expect(sanitized).toContain('after');
    expect(sanitized).toContain('done');
    expect(sanitized).not.toContain('inline-token');
    expect(sanitized).not.toContain('inline-password');
    expect(sanitized).not.toContain('inline-bearer-token');
  });
});

describe('logger sanitization integration', () => {
  const originalLogLevel = process.env.LOG_LEVEL;

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  it('routes response log data through sanitizeObject before writing logs', () => {
    process.env.LOG_LEVEL = 'info';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logResponse('request-123', 'POST', '/api/auth/login', 200, 34, {
      token: 'response-token',
      nested: {
        authorization: 'Bearer response-bearer-token',
      },
      safeStatus: 'completed',
    });

    expect(logSpy).toHaveBeenCalledTimes(1);

    const entry = JSON.parse(String(logSpy.mock.calls[0][0]));

    expect(entry.data.token).toBe('[REDACTED]');
    expect(entry.data.nested.authorization).toBe('[REDACTED]');
    expect(entry.data.safeStatus).toBe('completed');
    expect(JSON.stringify(entry)).not.toContain('response-token');
    expect(JSON.stringify(entry)).not.toContain('response-bearer-token');
  });
});
