/**
 * Idempotency Middleware
 * 
 * Middleware to handle idempotency keys for critical write endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import {
    checkIdempotencyKey,
    storeIdempotencyRecord,
    reserveIdempotencyKey,
    releaseIdempotencyKey,
} from './store';
import { IDEMPOTENCY_CONFIG } from './config';

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
    const result = await checkIdempotencyKey(idempotencyKey, requestHash);

    if (!result.exists) {
        return null; // First time seeing this key
    }

    if (result.conflict) {
        // Same key, different body
        return NextResponse.json(
            {
                error: 'Idempotency Key Conflict',
                message: 'The provided idempotency key was already used with a different request body.',
            },
            { status: 422 }
        );
    }

    if (result.inFlight) {
        return NextResponse.json(
            {
                error: 'Idempotency Key In Progress',
                message: 'A request with this idempotency key is currently in progress.',
            },
            { status: 409 }
        );
    }

    // Return cached response
    const response = result.record?.response;
    if (!response) return null;
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
    handler: (body: any) => Promise<NextResponse>,
    options?: { required?: boolean; ttlMs?: number }
): Promise<NextResponse> {
    const idempotencyKey = getIdempotencyKey(request);
    if (options?.required && !idempotencyKey) {
        return NextResponse.json(
            { error: 'Idempotency-Key header is required' },
            { status: 400 }
        );
    }

    if (
        idempotencyKey &&
        (
            idempotencyKey.length < IDEMPOTENCY_CONFIG.MIN_KEY_LENGTH ||
            idempotencyKey.length > IDEMPOTENCY_CONFIG.MAX_KEY_LENGTH
        )
    ) {
        return NextResponse.json(
            { error: 'Invalid Idempotency-Key header' },
            { status: 400 }
        );
    }

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

    if (idempotencyKey) {
        const reservation = reserveIdempotencyKey(
            idempotencyKey,
            hashRequestBody(body),
            options?.ttlMs
        );
        if (reservation.conflict) {
            return NextResponse.json(
                {
                    error: 'Idempotency Key Conflict',
                    message: 'The provided idempotency key was already used with a different request body.',
                },
                { status: 422 }
            );
        }
        if (reservation.inFlight) {
            return NextResponse.json(
                {
                    error: 'Idempotency Key In Progress',
                    message: 'A request with this idempotency key is currently in progress.',
                },
                { status: 409 }
            );
        }
        if (!reservation.reserved) {
            return await checkIdempotency(request, body);
        }
    }

    // Execute handler
    let response: NextResponse;
    try {
        response = await handler(body);
    } catch (error) {
        if (idempotencyKey) releaseIdempotencyKey(idempotencyKey);
        throw error;
    }

    // Store response for future idempotency checks (only for successful responses)
    if (response.status >= 200 && response.status < 300) {
        const responseBody = await response.clone().json();
        storeIdempotentResponse(request, body, {
            status: response.status,
            body: responseBody,
        });
    } else if (idempotencyKey) {
        releaseIdempotencyKey(idempotencyKey);
    }

    return response;
}
