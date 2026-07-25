// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ContractErrorCode,
  CONTRACT_ERROR_KEY_MAP,
  getContractErrorMessageKey,
  toUserMessage,
  parseContractError,
  mapNumericCodeToError,
  mapStringCodeToError,
  ContractError,
  ContractErrorCategory,
  createSystemError,
} from '../../../lib/errors/contract-errors';

// Helper to check if a dot-separated path exists in a JSON object
function hasKey(obj: any, pathStr: string): boolean {
  const parts = pathStr.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    if (!(part in current)) {
      return false;
    }
    current = current[part];
  }
  return true;
}

describe('Contract Error Localized Message System Tests', () => {
  const enPath = path.resolve(process.cwd(), 'lib/i18n/locales/en.json');
  const esPath = path.resolve(process.cwd(), 'lib/i18n/locales/es.json');

  const enCatalog = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const esCatalog = JSON.parse(fs.readFileSync(esPath, 'utf8'));

  // A. Every ContractErrorCode has a mapping.
  it('A. Every ContractErrorCode enum value has a translation mapping', () => {
    const codes = Object.values(ContractErrorCode).filter((v) => typeof v === 'number') as number[];
    expect(codes.length).toBeGreaterThan(0);
    for (const code of codes) {
      expect(CONTRACT_ERROR_KEY_MAP).toHaveProperty(String(code));
      const key = CONTRACT_ERROR_KEY_MAP[code as ContractErrorCode];
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    }
  });

  // B. Every mapped key exists in BOTH en.json and es.json
  it('B. Every mapped key exists in both en.json and es.json', () => {
    // Also include the fallback generic key
    const keysToCheck: string[] = [
      'contractErrors.generic',
      ...Object.values(CONTRACT_ERROR_KEY_MAP),
    ];

    for (const key of keysToCheck) {
      const existsInEn = hasKey(enCatalog, key);
      const existsInEs = hasKey(esCatalog, key);

      if (!existsInEn) {
        throw new Error(`Missing translation key "${key}" in en.json`);
      }
      if (!existsInEs) {
        throw new Error(`Missing translation key "${key}" in es.json`);
      }

      expect(existsInEn).toBe(true);
      expect(existsInEs).toBe(true);
    }
  });

  // C. Unknown numeric codes return the generic localized key.
  it('C. Unknown numeric codes return the generic localized key', () => {
    const key = getContractErrorMessageKey(9999);
    expect(key).toBe('contractErrors.generic');

    const err = mapNumericCodeToError(9999);
    expect(err.message).toBe('contractErrors.generic');
  });

  // D. Unknown string codes return the generic localized key.
  it('D. Unknown string codes return the generic localized key', () => {
    const key = getContractErrorMessageKey('UNKNOWN_CODE_STRING');
    expect(key).toBe('contractErrors.generic');

    const err = mapStringCodeToError('UNKNOWN_CODE_STRING');
    expect(err.message).toBe('contractErrors.generic');
  });

  // E. No raw code fallback strings are returned anywhere.
  it('E. No raw code fallback strings are returned anywhere', () => {
    const mockT = (key: string) => {
      // simulate localized translation resolution
      if (key === 'contractErrors.unauthorized') return 'Unauthorized';
      if (key === 'contractErrors.generic') return 'Generic Error';
      return key;
    };

    const err1 = mapNumericCodeToError(2000); // unauthorized
    const msg1 = toUserMessage(err1, mockT);
    expect(msg1).not.toContain('2000');
    expect(msg1).not.toContain('Contract error');
    expect(msg1).toBe('Unauthorized');

    const err2 = mapNumericCodeToError(9999); // unknown
    const msg2 = toUserMessage(err2, mockT);
    expect(msg2).not.toContain('9999');
    expect(msg2).not.toContain('Contract error');
    expect(msg2).toBe('Generic Error');
  });

  // F. Missing translation keys cause tests to fail loudly.
  it('F. Missing translation keys fail loudly', () => {
    const fakeKey = 'contractErrors.nonExistentKey';
    expect(() => {
      if (!hasKey(enCatalog, fakeKey)) {
        throw new Error(`Missing translation key "${fakeKey}" in en.json`);
      }
    }).toThrow(`Missing translation key "${fakeKey}" in en.json`);
  });

  describe('Additional unit testing for full coverage', () => {
    it('handles numeric string code in mapStringCodeToError', () => {
      const err = mapStringCodeToError('2000');
      expect(err.code).toBe('2000');
      expect(err.message).toBe('contractErrors.unauthorized');
      expect(err.category).toBe(ContractErrorCategory.AUTHENTICATION);
      expect(err.httpStatus).toBe(401);
    });

    it('handles case-insensitive enum names in mapStringCodeToError', () => {
      const err = mapStringCodeToError('unauthorized');
      expect(err.code).toBe('2000');
      expect(err.message).toBe('contractErrors.unauthorized');
    });

    it('correctly maps ranges to categories and statuses', () => {
      // 1000 range (Validation)
      const errValidation = mapNumericCodeToError(1000);
      expect(errValidation.category).toBe(ContractErrorCategory.VALIDATION);
      expect(errValidation.httpStatus).toBe(400);

      // 2000 range (Authentication)
      const errAuth = mapNumericCodeToError(2000);
      expect(errAuth.category).toBe(ContractErrorCategory.AUTHENTICATION);
      expect(errAuth.httpStatus).toBe(401);

      // 3000 range (Not Found)
      const errNotFound = mapNumericCodeToError(3000);
      expect(errNotFound.category).toBe(ContractErrorCategory.NOT_FOUND);
      expect(errNotFound.httpStatus).toBe(404);

      // 4000 range (Execution / System)
      const errSystem = mapNumericCodeToError(4002);
      expect(errSystem.category).toBe(ContractErrorCategory.EXECUTION_FAILED);
      expect(errSystem.httpStatus).toBe(500);
      expect(errSystem.isRetryable).toBe(true);

      const errExec = mapNumericCodeToError(4000);
      expect(errExec.category).toBe(ContractErrorCategory.EXECUTION_FAILED);
      expect(errExec.httpStatus).toBe(500);
      expect(errExec.isRetryable).toBe(false);

      // 5000 range (Limits / Validation)
      const errLimit = mapNumericCodeToError(5000);
      expect(errLimit.category).toBe(ContractErrorCategory.VALIDATION);
      expect(errLimit.httpStatus).toBe(422);
    });

    it('parses contract error objects correctly', () => {
      // Should return original ContractError
      const orig = new ContractError(ContractErrorCategory.VALIDATION, '1001', 'custom');
      expect(parseContractError(orig)).toBe(orig);

      // Should extract numeric code from messages
      const parsed1 = parseContractError(new Error('Contract error: 4002'));
      expect(parsed1.code).toBe('4002');
      expect(parsed1.message).toBe('contractErrors.systemError');

      const parsed2 = parseContractError(new Error('Contract error code 2001'));
      expect(parsed2.code).toBe('2001');
      expect(parsed2.message).toBe('contractErrors.forbidden');

      // Should extract code property
      const parsedProp = parseContractError({ code: 1002 });
      expect(parsedProp.code).toBe('1002');
      expect(parsedProp.message).toBe('contractErrors.invalidRecipient');

      // Should handle string codes from message
      const parsedStr = parseContractError(new Error('Contract error: unauthorized'));
      expect(parsedStr.code).toBe('2000');
      expect(parsedStr.message).toBe('contractErrors.unauthorized');

      // Should extract code property as string
      const parsedPropStr = parseContractError({ code: 'unauthorized' });
      expect(parsedPropStr.code).toBe('2000');
      expect(parsedPropStr.message).toBe('contractErrors.unauthorized');

      // Should fallback gracefully
      const parsedFallback = parseContractError(new Error('something weird happened'));
      expect(parsedFallback.code).toBe('CONTRACT_EXEC_ERROR');
      expect(parsedFallback.message).toBe('contractErrors.generic');
    });

    it('toUserMessage falls back cleanly if message doesn\'t start with expected namespace', () => {
      const mockT = (key: string) => `translated-${key}`;
      const err = new ContractError(ContractErrorCategory.VALIDATION, '1001', 'some_legacy_message');
      const msg = toUserMessage(err, mockT);
      expect(msg).toBe('translated-contractErrors.invalidAmount');
    });

    it('covers createSystemError helper', () => {
      const err = createSystemError('system failed');
      expect(err.code).toBe('SYSTEM_ERROR');
      expect(err.message).toBe('system failed');
      expect(err.category).toBe(ContractErrorCategory.EXECUTION_FAILED);
    });
  });
});
