import {
  assertWriteBackwardCompatible,
  AuditCompatibilityError,
  CURRENT_SCHEMA_VERSION,
  isSchemaCompatible,
  MIN_SUPPORTED_SCHEMA_VERSION,
  normalizeLegacyAuditRow,
  SUPPORTED_SCHEMA_VERSIONS,
  UNKNOWN_ACTION_FALLBACK,
} from './audit-storage.compatibility';

describe('audit-storage.compatibility (issue #1679)', () => {
  describe('isSchemaCompatible', () => {
    it('treats legacy rows without a version as readable', () => {
      expect(isSchemaCompatible(null)).toBe(true);
      expect(isSchemaCompatible(undefined)).toBe(true);
    });

    it('accepts every explicitly supported version', () => {
      for (const v of SUPPORTED_SCHEMA_VERSIONS) {
        expect(isSchemaCompatible(v)).toBe(true);
      }
    });

    it('rejects versions outside the supported window', () => {
      expect(isSchemaCompatible(MIN_SUPPORTED_SCHEMA_VERSION - 1)).toBe(false);
      expect(isSchemaCompatible(CURRENT_SCHEMA_VERSION + 1)).toBe(false);
    });
  });

  describe('normalizeLegacyAuditRow (backward compatibility)', () => {
    it('fills safe defaults for rows written before newer columns existed', () => {
      const legacy = normalizeLegacyAuditRow({
        id: 7,
        entityName: 'authorization',
        action: 'AUTHORIZATION_GRANTED',
        entityId: '1',
      });

      expect(legacy.entityName).toBe('authorization');
      expect(legacy.action).toBe('AUTHORIZATION_GRANTED');
      expect(legacy.entityId).toBe('1');
      // Newer nullable columns default safely.
      expect(legacy.correlationId).toBeNull();
      expect(legacy.chainHash).toBeNull();
      expect(legacy.contributionXp).toBe(0);
      expect(legacy.epochNumber).toBeNull();
      expect(legacy.newValues).toBeNull();
      expect(legacy.schemaVersion).toBeNull();
    });

    it('surfaces an unknown (future) action instead of throwing (forward compat)', () => {
      const row = normalizeLegacyAuditRow({
        entityName: 'authorization',
        action: 'SOME_FUTURE_ACTION',
      });
      expect(row.action).toBe(UNKNOWN_ACTION_FALLBACK);
    });

    it('preserves known values and newer columns when present', () => {
      const row = normalizeLegacyAuditRow({
        entityName: 'contract',
        action: 'CONTRACT_EVENT',
        correlationId: 'corr-123',
        chainHash: 'abc',
        contributionXp: 42,
        epochNumber: 3,
        schemaVersion: 4,
      });
      expect(row.correlationId).toBe('corr-123');
      expect(row.chainHash).toBe('abc');
      expect(row.contributionXp).toBe(42);
      expect(row.epochNumber).toBe(3);
      expect(row.schemaVersion).toBe(4);
    });

    it('coerces a non-numeric contributionXp to the safe default', () => {
      const row = normalizeLegacyAuditRow({
        entityName: 'x',
        action: 'READ',
        contributionXp: 'not-a-number',
      });
      expect(row.contributionXp).toBe(0);
    });
  });

  describe('assertWriteBackwardCompatible (forward compatibility gate)', () => {
    it('passes a well-formed write', () => {
      expect(() =>
        assertWriteBackwardCompatible({
          entityName: 'authorization',
          correlationId: 'short',
        }),
      ).not.toThrow();
    });

    it('throws AuditCompatibilityError when a field exceeds the bound assumed by older readers', () => {
      const oversize = 'x'.repeat(300); // > entityId bound of 255
      let caught: unknown;
      try {
        assertWriteBackwardCompatible({ entityName: 'a', entityId: oversize });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(AuditCompatibilityError);
      expect((caught as AuditCompatibilityError).field).toBe('entityId');
    });

    it('reports the offending field for every bounded column', () => {
      const cases: Array<
        [keyof Parameters<typeof assertWriteBackwardCompatible>[0], number]
      > = [
        ['entityName', 100],
        ['performedByEmail', 255],
        ['ipAddress', 45],
        ['txHash', 128],
        ['contract', 100],
        ['contractAction', 100],
        ['chainHash', 128],
        ['stateRoot', 128],
        ['correlationId', 64],
        ['participantAddress', 255],
      ];
      for (const [field, max] of cases) {
        const record = { [field]: 'y'.repeat(max + 1) } as Record<
          string,
          string
        >;
        try {
          assertWriteBackwardCompatible(record as never);
          throw new Error(`expected ${field} to be rejected`);
        } catch (err) {
          expect(err).toBeInstanceOf(AuditCompatibilityError);
          expect((err as AuditCompatibilityError).field).toBe(field);
        }
      }
    });
  });
});
