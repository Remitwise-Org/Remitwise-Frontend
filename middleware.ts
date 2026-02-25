/**
 * middleware.ts  (project root – runs in the Edge Runtime)
 *
 * Applies ONLY to /api routes (see `config.matcher` below).
 *
 * Responsibilities:
 *  1. Ensure every request carries an `x-request-id` header.
 *     - Forward the client-supplied value if present.
 *     - Generate a new UUID v4 otherwise.
 *  2. Propagate the same `x-request-id` on the response.
 *
 * This is intentionally lightweight — the heavy structured logging is done
 * inside `withApiLogger()` at the route-handler level where we have access
 * to the Node.js runtime and pino.
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    const incomingId = request.headers.get("x-request-id");
    const requestId = incomingId || crypto.randomUUID();

    // Clone request headers so we can attach the (possibly generated) ID
    // for downstream route handlers to read.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-request-id", requestId);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    // Also set the header on the response so the caller can correlate.
    response.headers.set("x-request-id", requestId);

    return response;
}

/**
 * Only run this middleware on API routes.
 */
export const config = {
    matcher: "/api/:path*",
};
