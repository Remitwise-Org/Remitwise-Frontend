export interface AuditEvent {
  id: string;
  type: string;
  actor: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const MAX_AUDIT_EVENTS = 500;
const auditEvents: AuditEvent[] = [];

/**
 * Record an audit event. Writes to both in-memory buffer (for fast reads)
 * and persists to Prisma for durability.
 */
export function recordAuditEvent(input: Omit<AuditEvent, 'id' | 'createdAt'>): AuditEvent {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  // In-memory buffer (kept for backwards compatibility with synchronous reads)
  auditEvents.unshift(event);
  if (auditEvents.length > MAX_AUDIT_EVENTS) {
    auditEvents.length = MAX_AUDIT_EVENTS;
  }

  // Async Prisma persistence — fire-and-forget, errors logged but never crash caller
  persistAuditEvent(event).catch((err) => {
    console.error('[Audit] Failed to persist audit event:', err);
  });

  return event;
}

/**
 * Persist an audit event to the database via Prisma.
 * Called asynchronously from recordAuditEvent.
 */
async function persistAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.adminAuditEvent.create({
      data: {
        id: event.id,
        eventType: event.type,
        actor: event.actor,
        message: event.message,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        createdAt: new Date(event.createdAt),
      },
    });
  } catch (err) {
    console.error('[Audit] Prisma persistence error:', err);
  }
}

/**
 * Get audit events. Returns from in-memory buffer for backwards compatibility.
 * The buffer is kept in sync with Prisma writes.
 */
export function getAuditEvents(limit: number): AuditEvent[] {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50;
  return auditEvents.slice(0, Math.min(safeLimit, MAX_AUDIT_EVENTS));
}
