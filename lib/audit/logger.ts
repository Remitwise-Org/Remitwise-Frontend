/**
 * Core Audit Logger
 * 
 * Centralized logging for all sensitive operations in RemitWise.
 * Logs to stdout (structured JSON) or database, with no secrets included.
 */

import type { AuditEvent, AuditConfig } from './types';
import { sanitize, sanitizeError } from './sanitize';
import prisma from '@/lib/db';

/**
 * Get audit configuration from environment variables
 */
function getConfig(): AuditConfig {
  return {
    enabled: process.env.AUDIT_LOG_ENABLED !== 'false', // Enabled by default
    destination: (process.env.AUDIT_LOG_DESTINATION as any) || 'stdout',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
    includeMetadata: process.env.AUDIT_INCLUDE_METADATA !== 'false',
  };
}

/**
 * Format audit event as JSON string
 */
function formatEvent(event: AuditEvent): string {
  return JSON.stringify(event);
}

/**
 * Write audit event to stdout
 */
async function writeToStdout(event: AuditEvent): Promise<void> {
  console.log('[AUDIT]', formatEvent(event));
}

/**
 * Write audit event to database
 * Note: Requires AuditLog table in Prisma schema
 */
async function writeToDatabase(event: AuditEvent): Promise<void> {
  try {
    // Using raw SQL for flexibility - table may not exist yet
    await prisma.$executeRawUnsafe(
      `INSERT INTO AuditLog (id, timestamp, action, address, ip, resource, result, error, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      generateId(),
      event.timestamp,
      event.action,
      event.address || null,
      event.ip || null,
      event.resource || null,
      event.result,
      event.error || null,
      event.metadata ? JSON.stringify(event.metadata) : null
    );
  } catch (error) {
    // If table doesn't exist or other DB error, fallback to stdout
    console.error('[AUDIT] Failed to write to database, falling back to stdout:', error);
    await writeToStdout(event);
  }
}

/**
 * Generate a unique ID for audit log entries
 */
function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Main audit logging function
 * 
 * @param event Audit event to log
 * 
 * @example
 * auditLog({
 *   timestamp: new Date().toISOString(),
 *   action: AuditAction.LOGIN_SUCCESS,
 *   address: 'GDEMOX...XXXX',
 *   ip: '192.168.1.100',
 *   result: 'success',
 * });
 */
export async function auditLog(event: AuditEvent): Promise<void> {
  const config = getConfig();

  // Skip if disabled
  if (!config.enabled) {
    return;
  }

  // Sanitize the event
  const sanitizedEvent: AuditEvent = {
    ...event,
    metadata: event.metadata ? sanitize(event.metadata) : undefined,
    error: event.error ? sanitizeError(event.error) : undefined,
  };

  // Remove metadata if not configured
  if (!config.includeMetadata) {
    delete sanitizedEvent.metadata;
  }

  // Write to appropriate destination
  try {
    switch (config.destination) {
      case 'database':
        await writeToDatabase(sanitizedEvent);
        break;
      case 'stdout':
      default:
        await writeToStdout(sanitizedEvent);
        break;
    }
  } catch (error) {
    console.error('[AUDIT] Failed to log event:', error);
  }
}

/**
 * Helper to extract IP address from Next.js request
 * Handles x-forwarded-for, x-real-ip, and direct connection
 */
export function extractIp(request: Request | { headers: Headers }): string | undefined {
  const headers = request.headers;

  // Try x-forwarded-for first (most common with proxies)
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the list
    return forwarded.split(',')[0].trim();
  }

  // Try x-real-ip
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // No IP found
  return undefined;
}

/**
 * Create an audit event with common fields pre-filled
 * 
 * @param action The action being audited
 * @param result Success or failure
 * @param options Additional event properties
 * @returns Complete audit event
 */
export function createAuditEvent(
  action: string,
  result: 'success' | 'failure',
  options: {
    address?: string;
    ip?: string;
    resource?: string;
    error?: string;
    metadata?: Record<string, any>;
  } = {}
): AuditEvent {
  return {
    timestamp: new Date().toISOString(),
    action: action as any,
    result,
    ...options,
  };
}
