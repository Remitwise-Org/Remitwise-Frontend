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

export function recordAuditEvent(input: Omit<AuditEvent, 'id' | 'createdAt'>): AuditEvent {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  auditEvents.unshift(event);
  if (auditEvents.length > MAX_AUDIT_EVENTS) {
    auditEvents.length = MAX_AUDIT_EVENTS;
  }
  return event;
}

export function getAuditEvents(limit: number): AuditEvent[] {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50;
  return auditEvents.slice(0, Math.min(safeLimit, MAX_AUDIT_EVENTS));
}

