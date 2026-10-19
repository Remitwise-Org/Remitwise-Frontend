/**
 * Idempotency Middleware
 * 
 * Middleware to handle idempotency keys for critical write endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { checkIdempotencyKey, storeIdempotencyRecord } from './store';

const IDEMPOTENCY_HEADER = 'idempotency-key';

/**
 * Generate hash of request body for comparison
 */
function hashRequestBody(body: any): string {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return createHash('sha256').update(bodyString).digest('hex');
}

/**
 * Extract idempotency key from request headers
 */
export function getIdempotencyKey(request: NextRequest): string | null {
    return request.headers.get(IDEMPOTENCY_HEADER);
}

/**
 * Check idempotency and return cached response if applicable
 * 
 * @returns NextResponse if cached response exists, null otherwise
 */
export async function checkIdempotency(
    request: NextRequest,
    body: any
): Promise<NextResponse | null> {
    const idempotencyKey = getIdempotencyKey(request);

    if (!idempotencyKey) {
        return null; // No idempotency key provided
    }

    const requestHash = hashRequestBody(body);
    const result = checkIdempotencyKey(idempotencyKey, requestHash);

    if (!result.exists) {
        return null; // First time seeing this key
    }

    if (result.conflict) {
        // Same key, different body - conflict
        return NextResponse.json(
            {
                error: 'Idempotency Key Conflict',
                message: 'The provided idempotency key was already used with a different request body.',
            },
            { status: 409 }
        );
    }

    // Return cached response
    const { response } = result.record!;
    return NextResponse.json(response.body, {
        status: response.status,
        headers: {
            'X-Idempotent-Replay': 'true',
            ...response.headers,
        },
    });
}

/**
 * Store response for future idempotency checks
 */
export function storeIdempotentResponse(
    request: NextRequest,
    body: any,
    response: { status: number; body: any; headers?: Record<string, string> }
): void {
    const idempotencyKey = getIdempotencyKey(request);

    if (!idempotencyKey) {
        return; // No idempotency key to store
    }

    const requestHash = hashRequestBody(body);
    storeIdempotencyRecord(idempotencyKey, requestHash, response);
}

/**
 * Wrapper function to handle idempotency for an endpoint
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return withIdempotency(request, async (body) => {
 *     // Your endpoint logic here
 *     const result = await processRemittance(body);
 *     return NextResponse.json(result);
 *   });
 * }
 * ```
 */
export async function withIdempotency(
    request: NextRequest,
    handler: (body: any) => Promise<NextResponse>
): Promise<NextResponse> {
    // Parse request body
    let body: any;
    try {
        body = await request.json();
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 }
        );
    }

    // Check for cached response
    const cachedResponse = await checkIdempotency(request, body);
    if (cachedResponse) {
        return cachedResponse;
    }

    // Execute handler
    const response = await handler(body);

    // Store response for future idempotency checks (only for successful responses)
    if (response.status >= 200 && response.status < 300) {
        const responseBody = await response.clone().json();
        storeIdempotentResponse(request, body, {
            status: response.status,
            body: responseBody,
        });
    }

    return response;
}
