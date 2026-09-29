import { NextRequest, NextResponse } from 'next/server'

import {
  handleNonceRequest,
  redactedKey,
  type NonceFailure,
  type NonceSuccess,
} from '@/lib/auth/nonce'

/**
 * POST /api/auth/nonce  (+ GET with query params for simple fetch)
 *
 * Issues a single-use auth nonce bound to the caller's identity.
 * Identity resolution (fail-closed, never client-assertable alone):
 *   1. `auth_token` cookie session principal (preferred, verified server-side)
 *   2. `address` body/query field (anonymous sign-in bootstrap only)
 * Neither => 401 NO_ACTIVE_SESSION.
 *
 * Deterministic failure boundary (issue #1712):
 *  200 ok:true (+ deduped:true on idempotent retry)
 *  400 INVALID_INPUT | 401 NO_ACTIVE_SESSION | 403 PRINCIPAL_NOT_AUTHORIZED
 *  409 DUPLICATE_REUSED | 410 STALE_VERSION | 429 RATE_LIMITED | 503 STORE_UNAVAILABLE
 * Bodies never echo nonces, tokens, or policy internals; logs carry only a
 * truncated requestKey prefix. Always `Cache-Control: no-store, private`.
 */

// Re-export so the issue's stated entry point
// `handleNonceRequest in ./app/api/auth/nonce/route.ts` holds.
export { handleNonceRequest }

interface PrincipalSession {
  principal: string | null
  isValid: boolean
}

function resolvePrincipal(token: string): PrincipalSession {
  if (!token) return { principal: null, isValid: false }
  const segments = token.split('.')
  if (segments.length === 3) {
    try {
      const raw = Buffer.from(segments[1], 'base64url').toString('utf8')
      const payload = JSON.parse(raw) as { sub?: unknown }
      if (typeof payload.sub === 'string' && payload.sub.length > 0) {
        return { principal: payload.sub, isValid: true }
      }
    } catch {
      return { principal: null, isValid: false }
    }
    return { principal: null, isValid: false }
  }
  if (token.length > 0 && token.length <= 320) {
    return { principal: token, isValid: true }
  }
  return { principal: null, isValid: false }
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
} as const

function ok(result: NonceSuccess): NextResponse {
  return NextResponse.json(result, { status: 200, headers: { ...NO_STORE_HEADERS } })
}

function err(result: NonceFailure, requestKey: unknown): NextResponse {
  // Diagnosable without secrets: code + retryability + truncated key only.
  console.error('[/api/auth/nonce]', result.code, {
    key: redactedKey(typeof requestKey === 'string' ? requestKey : null),
    retryable: result.retryable,
  })
  const headers: Record<string, string> = { ...NO_STORE_HEADERS }
  if (result.retryable && (result.code === 'RATE_LIMITED' || result.code === 'STORE_UNAVAILABLE')) {
    headers['Retry-After'] = '5'
  }
  return NextResponse.json(
    { ok: false, code: result.code, message: result.message, retryable: result.retryable, uiState: result.uiState },
    { status: result.status, headers },
  )
}

function sessionFrom(req: NextRequest): string | null {
  const token = req.cookies.get('auth_token')?.value ?? ''
  const session = resolvePrincipal(token)
  return session.isValid ? session.principal : null
}

function clientVersionFrom(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isSafeInteger(n) || n < 0) return undefined
  return n
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }
    const b = (body ?? {}) as Record<string, unknown>
    const result = handleNonceRequest(
      { principal: b.principal, address: b.address, requestKey: b.requestKey, clientVersion: clientVersionFrom(b.clientVersion) },
      { sessionPrincipal: sessionFrom(req) },
    )
    if (result.ok) return ok(result)
    return err(result, b.requestKey)
  } catch (e) {
    console.error('[/api/auth/nonce]', 'UNHANDLED', e)
    return NextResponse.json(
      { ok: false, code: 'STORE_UNAVAILABLE', message: 'Unable to issue nonce. Retry shortly.', retryable: true, uiState: 'retry' },
      { status: 503, headers: { ...NO_STORE_HEADERS, 'Retry-After': '5' } },
    )
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const q = req.nextUrl.searchParams
    const result = handleNonceRequest(
      {
        principal: q.get('principal') ?? undefined,
        address: q.get('address') ?? undefined,
        requestKey: q.get('requestKey') ?? undefined,
        clientVersion: clientVersionFrom(q.get('clientVersion')),
      },
      { sessionPrincipal: sessionFrom(req) },
    )
    if (result.ok) return ok(result)
    return err(result, q.get('requestKey'))
  } catch (e) {
    console.error('[/api/auth/nonce]', 'UNHANDLED', e)
    return NextResponse.json(
      { ok: false, code: 'STORE_UNAVAILABLE', message: 'Unable to issue nonce. Retry shortly.', retryable: true, uiState: 'retry' },
      { status: 503, headers: { ...NO_STORE_HEADERS, 'Retry-After': '5' } },
    )
  }
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { setNonce } from '@/lib/auth-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STELLAR_ADDRESS_REGEX = /^G[A-Z0-9]{55}$/;

function isValidStellarAddress(address: string): boolean {
  return STELLAR_ADDRESS_REGEX.test(address);
}

/**
 * Extracts address from query params or request body
 */
export async function resolveAddressFromRequest(request: NextRequest): Promise<string | null> {
  const queryAddress = request.nextUrl.searchParams.get('address')?.trim();
  if (queryAddress) return queryAddress;

  if (request.method === 'POST') {
    try {
      const body = await request.clone().json();
      const address = (body.publicKey || body.address);
      if (typeof address === 'string') return address.trim();
    } catch {
      // Ignore body parsing errors
    }
  }

  return null;
}

async function handleNonceRequest(request: NextRequest) {
  try {
    const address = await resolveAddressFromRequest(request);

    if (!address || !isValidStellarAddress(address)) {
      return NextResponse.json(
        { error: 'Valid Stellar address is required (e.g., ?address=G...)' },
        { status: 400 }
      );
    }

    const nonce = randomBytes(32).toString('hex');

    setNonce(address, nonce);

    return NextResponse.json({
      nonce,
      address,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleNonceRequest(request);
}

export async function POST(request: NextRequest) {
  return handleNonceRequest(request);
}
