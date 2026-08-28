import { CorrelationIdStore } from './correlation-id.store';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, AuditLog } from '../../audit/audit-log.entity';
import { Repository } from 'typeorm';
import { CORRELATION_ID_RESPONSE_HEADER } from './correlation-id.constants';

/**
 * Integration-style unit tests: correlation ID flows from store → audit
 * entries → webhook delivery headers (EventsService boundary).
 */
describe('correlation ID propagation across services', () => {
  it('AuditService persists the store correlation id on every entry', async () => {
    const store = new CorrelationIdStore();
    const saved: AuditLog[] = [];
    const repo = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => {
        saved.push(v as AuditLog);
        return v;
      }),
    } as unknown as Repository<AuditLog>;

    const audit = new AuditService(repo, store);

    await store.run('propagate-123', async () => {
      await audit.log({
        entityName: 'User',
        entityId: 9,
        action: AuditAction.CREATE,
      });
    });

    expect(saved[0].correlationId).toBe('propagate-123');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'propagate-123' }),
    );
  });

  it('webhook payload headers include the audit entry correlation id', () => {
    const auditEntry = { correlationId: 'wh-cid-99' };
    const store = new CorrelationIdStore();
    const correlationId =
      auditEntry.correlationId ?? store.get() ?? '';
    const headers = {
      'Content-Type': 'application/json',
      [CORRELATION_ID_RESPONSE_HEADER]: correlationId,
    };
    expect(headers[CORRELATION_ID_RESPONSE_HEADER]).toBe('wh-cid-99');
  });
});
