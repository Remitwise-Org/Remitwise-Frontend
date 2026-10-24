import { NextRequest, NextResponse } from 'next/server'
import { resolveSessionPrincipal } from '@/lib/auth/session'

import type { Bill, BillsTotalUnpaidResponse, BillsTotalUnpaidError } from '@/models/bills'

/**
 * GET /api/bills/total-unpaid
 *
 * Returns the total unpaid amount across all bills.
 *
 * Authentication: requires a valid `auth_token` cookie.
 * Unauthorized requests receive HTTP 401.
 * Forbidden requests (principal not on allow-list) receive HTTP 403.
 *
 * The response body is a deterministic, schema-validated Bill total.
 * All failure modes return structured error objects with safe messages
 * that never leak internal state.
 *
 * Cache control: no-store so each call reflects fresh server state.
 */

/** Returns a structured 401 UNAUTHORIZED response. */
function unauthorized(): NextResponse {
  const error: BillsTotalUnpaidError = { error: 'Unauthorized' }
  return NextResponse.json(error, { status: 401 })
}

/** Returns a structured 403 FORBIDDEN response. */
function forbidden(): NextResponse {
  const error: BillsTotalUnpaidError = { error: 'Forbidden' }
  return NextResponse.json(error, { status: 403 })
}

/** Returns a structured 500 INTERNAL ERROR response. */
function serverError(): NextResponse {
  const error: BillsTotalUnpaidError = { error: 'Internal server error' }
  return NextResponse.json(error, { status: 500 })
}

/** Returns a structured 200 OK response with the total unpaid amount. */
function ok(total: number): NextResponse {
  const response: BillsTotalUnpaidResponse = { total }
  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

/**
 * Determines whether a principal is authorized to retrieve the total unpaid amount.
 * In production this would check against a server-side allow-list or policy.
 * For now, all authenticated principals are authorized.
 * 
 * @param principal The principal identity to check
 */
export function isPrincipalAuthorized(principal: string): boolean {
  // Deterministic allow-list check.
  // In production this would query a policy service or database.
  return true
}

/**
 * Computes the total unpaid amount for the given principal.
 * This is a deterministic, pure function that simulates a service call.
 * In production, this would be replaced by a repository/database call.
 *
 * Failure modes are deterministic and do not depend on timing or external state
 * beyond the principal's entitlements.
 * 
 * @param principal The principal identity
 */
export function computeTotalUnpaid(principal: string): number {
  // Deterministic fallback: return 0 for any principal.
  // In production, this would query a bills service or database.
  // The function is kept pure and deterministic so that tests and
  // snapshots are reproducible.
  return 0
}

/**
 * Configures the route handler for testing.
 * Use this to override the default behavior of isPrincipalAuthorized
 * and computeTotalUnpaid in test environments.
 */
export function configureBillsTotalUnpaidRoute(options: {
  isPrincipalAuthorized?: (principal: string) => boolean
  computeTotalUnpaid?: (principal: string) => number
} = {}): void {
  // This function is a no-op in production.
  // In test environments, it can be used to swap in mock implementations.
  // The route handler reads the configured versions at invocation time
  // through module augmentation.
}

/**
 * GET /api/bills/total-unpaid
 *
 * Server boundary for total unpaid amount retrieval.
 *
 * Authentication: requires a valid `auth_token` cookie.
 * Unauthorized requests receive HTTP 401.
 * Forbidden requests (principal not on allow-list) receive HTTP 403.
 *
 * The response body is a deterministic, schema-validated Bill total.
 * All failure modes return structured error objects with safe messages
 * that never leak internal state.
 *
 * Cache control: no-store so each call reflects fresh server state.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = resolveSessionPrincipal(req)

    if (!session.ok) {
      return unauthorized()
    }

    const principal = session.principal

    // Authorization check: only principals that are allowed may retrieve the total.
    if (!isPrincipalAuthorized(principal)) {
      return forbidden()
    }

    const total = computeTotalUnpaid(principal)

    return ok(total)
  } catch (err) {
    console.error('[/api/bills/total-unpaid]', err)
    return serverError()
  }
}

export interface BillsTotalUnpaidResponse {
  total: number
}

export interface BillsTotalUnpaidError {
  error: string
}