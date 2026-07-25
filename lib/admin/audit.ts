import { prisma } from '@/lib/prisma';

export interface AuditEvent {
  id: string;
  type: string;
  actor: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

interface AuditEventRow {
  id: string;
  timestamp: Date;
  event: string;
  identity: string;
  details: string | null;
}

interface AuditEventDelegate {
  create(args: {
    data: {
      timestamp: Date;
      event: string;
      identity: string;
      details: string;
    };
  }): Promise<unknown>;
  findMany(args: {
    orderBy: {
      timestamp: 'desc';
    };
    take: number;
  }): Promise<AuditEventRow[]>;
}

const auditEventDelegate = (prisma as typeof prisma & {
  auditEvent?: AuditEventDelegate;
}).auditEvent;

export function recordAuditEvent(
  input: Omit<AuditEvent, 'id' | 'createdAt'>
): AuditEvent {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  const auditEventClient = (prisma as any).auditEvent;

  if (auditEventClient?.create) {
    void auditEventClient
      .create({
        data: {
          timestamp: new Date(event.createdAt),
          event: event.type,
          identity: event.actor,
          details: JSON.stringify({
            message: event.message,
            metadata: event.metadata,
          }),
        },
      })
      .catch((error: unknown) => {
        console.error('Failed to persist audit event:', error);
      });
  }

  return event;
}

export async function getAuditEvents(
  limit: number
): Promise<AuditEvent[]> {
  const safeLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const auditEventClient = (prisma as any).auditEvent;
  const events: any[] = auditEventClient?.findMany
    ? await auditEventClient.findMany({
        orderBy: {
          timestamp: 'desc',
        },
        take: safeLimit,
      })
    : [];

  return events.map((event: AuditEventRow) => {
    let details: {
      message?: string;
      metadata?: Record<string, unknown>;
    } = {};

    try {
      details = event.details
        ? JSON.parse(event.details)
        : {};
    } catch {
      // ignore malformed payloads
    }

    return {
      id: event.id,
      type: event.event,
      actor: event.identity,
      message: details.message ?? '',
      metadata: details.metadata,
      createdAt: event.timestamp.toISOString(),
    };
  });
}
