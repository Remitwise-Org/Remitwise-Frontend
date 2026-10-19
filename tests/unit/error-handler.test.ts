import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapError } from '../../lib/api/error-handler';
import { ContractError, ContractErrorCategory } from '../../lib/errors/contract-errors';

describe('Error Handler Mapping Tests', () => {
  it('should map a ContractError correctly onto the canonical envelope', () => {
    const error = new ContractError(ContractErrorCategory.VALIDATION, 'INVALID_AMOUNT', 'Amount must be greater than zero', 422);
    const { status, body } = mapError(error, 'req-12345');
    assert.strictEqual(status, 422);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'INVALID_AMOUNT');
    assert.strictEqual(body.requestId, 'req-12345');
  });

  it('should fallback cleanly to standard properties for standard Error types', () => {
    const error = new Error('Database connection timed out');
    (error as any).status = 503;
    (error as any).code = 'DATABASE_TIMEOUT';
    const { status, body } = mapError(error, 'req-67890');
    assert.strictEqual(status, 503);
    assert.strictEqual(body.error.code, 'DATABASE_TIMEOUT');
  });

  it('should transform arbitrary values or string throws gracefully', () => {
    const { status, body } = mapError('Catastrophic crash', 'req-99999');
    assert.strictEqual(status, 500);
    assert.strictEqual(body.error.code, 'UNEXPECTED_ERROR');
  });
});
