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

export function recordAuditEvent(
  input: Omit<AuditEvent, 'id' | 'createdAt'>
): AuditEvent {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  void prisma.auditEvent
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
    .catch((error) => {
      console.error('Failed to persist audit event:', error);
    });

  return event;
}

export async function getAuditEvents(
  limit: number
): Promise<AuditEvent[]> {
  const safeLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const events = await prisma.auditEvent.findMany({
    orderBy: {
      timestamp: 'desc',
    },
    take: safeLimit,
  });

  return events.map((event) => {
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