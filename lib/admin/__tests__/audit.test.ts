import { describe, expect, it, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getAuditEvents, recordAuditEvent } from '../audit';

describe('audit', () => {
  beforeEach(async () => {
    await prisma.auditEvent.deleteMany();
    vi.restoreAllMocks();
  });

  it('returns newest events first', async () => {
    recordAuditEvent({
      type: 'first',
      actor: 'admin',
      message: 'first event',
    });

    recordAuditEvent({
      type: 'second',
      actor: 'admin',
      message: 'second event',
    });

    recordAuditEvent({
      type: 'third',
      actor: 'admin',
      message: 'third event',
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const events = await getAuditEvents(3);

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('third');
    expect(events[1].type).toBe('second');
    expect(events[2].type).toBe('first');
  });

  it('returns empty array when table is empty', async () => {
    expect(await getAuditEvents(50)).toEqual([]);
  });

  it('clamps limit to 200', async () => {
    const spy = vi
      .spyOn(prisma.auditEvent, 'findMany')
      .mockResolvedValue([]);

    await getAuditEvents(1000);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200,
      })
    );
  });

  it('does not throw when audit write fails', () => {
    vi.spyOn(prisma.auditEvent, 'create').mockRejectedValue(
      new Error('database unavailable')
    );

    expect(() =>
      recordAuditEvent({
        type: 'cache.clear',
        actor: 'admin',
        message: 'cache cleared',
      })
    ).not.toThrow();
  });
});
