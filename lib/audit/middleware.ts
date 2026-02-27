/**
 * Audit Middleware
 * 
 * Wrapper functions to automatically audit API route handlers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLog, extractIp, createAuditEvent, AuditAction } from './index';
import { getSession } from '@/lib/session';

/**
 * Wrap a route handler with automatic audit logging
 * Logs both success and failure outcomes
 * 
 * @param action The audit action to log
 * @param handler The route handler function
 * @param extractResource Optional function to extract resource ID from request/response
 * @param extractMetadata Optional function to extract metadata from request/response
 * 
 * @example
 * export const POST = withAudit(
 *   AuditAction.GOAL_CREATE,
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ id: 'goal_123' });
 *   },
 *   (req, res) => res?.id // Extract resource ID
 * );
 */
export function withAudit<T = any>(
  action: AuditAction,
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  extractResource?: (request: NextRequest, response?: any) => string | undefined,
  extractMetadata?: (request: NextRequest, response?: any) => Record<string, any> | undefined
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const startTime = Date.now();
    let address: string | undefined;
    let responseData: any;
    let result: 'success' | 'failure' = 'success';
    let error: string | undefined;

    try {
      // Try to get user address from session
      try {
        const session = await getSession();
        address = session?.address;
      } catch {
        // Session not available, continue without it
      }

      // Try to get address from headers as fallback
      if (!address) {
        address = request.headers.get('x-user') || 
                  request.headers.get('x-stellar-public-key') || 
                  undefined;
      }

      // Execute the handler
      const response = await handler(request);
      
      // Extract response data if successful
      try {
        const clonedResponse = response.clone();
        responseData = await clonedResponse.json();
      } catch {
        // Response is not JSON or already consumed
      }

      // Log successful audit event
      await auditLog(
        createAuditEvent(action, 'success', {
          address,
          ip: extractIp(request),
          resource: extractResource ? extractResource(request, responseData) : undefined,
          metadata: extractMetadata ? extractMetadata(request, responseData) : undefined,
        })
      );

      return response;

    } catch (err: any) {
      result = 'failure';
      error = err?.message || String(err);

      // Log failed audit event
      await auditLog(
        createAuditEvent(action, 'failure', {
          address,
          ip: extractIp(request),
          resource: extractResource ? extractResource(request, responseData) : undefined,
          error,
        })
      );

      // Re-throw the error
      throw err;
    }
  };
}

/**
 * Simpler audit wrapper that just logs the action without automatic error handling
 * Use this when you want more control over the audit logging
 * 
 * @param action The audit action
 * @param request The Next.js request
 * @param result Success or failure
 * @param options Additional audit options
 */
export async function logAudit(
  action: AuditAction,
  request: NextRequest,
  result: 'success' | 'failure',
  options: {
    resource?: string;
    error?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  let address: string | undefined;

  // Try to get user address from session
  try {
    const session = await getSession();
    address = session?.address;
  } catch {
    // Session not available, try headers
    address = request.headers.get('x-user') || 
              request.headers.get('x-stellar-public-key') || 
              undefined;
  }

  await auditLog(
    createAuditEvent(action, result, {
      address,
      ip: extractIp(request),
      ...options,
    })
  );
}
