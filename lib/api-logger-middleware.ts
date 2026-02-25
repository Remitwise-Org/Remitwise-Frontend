/**
 * lib/api-logger-middleware.ts
 *
 * Next.js App Router structured logging middleware for /api routes.
 *
 * Usage – wrap any route handler:
 *
 *   import { withApiLogger } from "@/lib/api-logger-middleware";
 *
 *   export const GET  = withApiLogger(async (req) => { ... });
 *   export const POST = withApiLogger(async (req) => { ... });
 *
 * What is logged (and *nothing* else):
 *   method, path, statusCode, durationMs, requestId, responseSizeBytes
 *
 * What is NEVER logged:
 *   request body, response body, any headers (Authorization, cookies, etc.),
 *   passwords, tokens, secrets, signatures.
 */

import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

// ─── Types ───────────────────────────────────────────────────────────────────

type RouteContext = { params?: Promise<Record<string, string | string[]>> };

type RouteHandler = (
    request: NextRequest,
    context: RouteContext,
) => Promise<NextResponse | Response> | NextResponse | Response;

// ─── ID generation ───────────────────────────────────────────────────────────

/**
 * Generate a v4-style random ID without requiring the `uuid` package.
 * Uses crypto.randomUUID() (available in Node ≥ 19 and all modern Edge runtimes).
 * Falls back to a simple hex string if unavailable.
 */
function generateRequestId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    // Fallback: 16 random hex bytes
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// ─── Sanitisation helpers (opt-in) ──────────────────────────────────────────

/**
 * Return only the first 6 characters of an address (e.g. wallet / blockchain
 * address).  Returns undefined for falsy input so callers can spread safely.
 */
export function sanitizeAddress(address: string | undefined | null): string | undefined {
    if (!address) return undefined;
    return address.slice(0, 6);
}

/**
 * Return only the domain part of an email address.
 * e.g. "user@example.com" → "example.com"
 * Returns undefined for falsy / malformed input.
 */
export function sanitizeEmail(email: string | undefined | null): string | undefined {
    if (!email) return undefined;
    const parts = email.split("@");
    return parts.length === 2 ? parts[1] : undefined;
}

// ─── Core middleware ────────────────────────────────────────────────────────

export function withApiLogger(handler: RouteHandler): RouteHandler {
    return async (request: NextRequest, context: RouteContext) => {
        const startTime = performance.now();

        // ── requestId: prefer incoming header, otherwise generate ──
        const incomingId = request.headers.get("x-request-id");
        const requestId = incomingId || generateRequestId();

        // ── Extract only the pathname (NO query params) ──
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // ── Create a child logger scoped to this request ──
        const reqLogger = logger.child({ requestId });

        let response: NextResponse | Response;
        let statusCode: number;
        let responseSizeBytes: number | null = null;

        try {
            response = await handler(request, context);
            statusCode = response.status;
        } catch (error) {
            // If the handler throws we still want to log the failure.
            statusCode = 500;
            response = NextResponse.json(
                { error: "Internal Server Error" },
                { status: 500 },
            );

            reqLogger.error({
                msg: "Unhandled route error",
                method,
                path,
                statusCode,
                requestId,
            });
        }

        // ── Duration ──
        const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

        // ── Response size from Content-Length (no body inspection) ──
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
            const parsed = parseInt(contentLength, 10);
            if (!Number.isNaN(parsed)) {
                responseSizeBytes = parsed;
            }
        }

        // ── Propagate requestId on response header ──
        // NextResponse allows mutation; plain Response does not.
        // Clone into a NextResponse if necessary.
        let outResponse: NextResponse;
        if (response instanceof NextResponse) {
            outResponse = response;
        } else {
            outResponse = new NextResponse(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: new Headers(response.headers),
            });
        }
        outResponse.headers.set("x-request-id", requestId);

        // ── Emit the single structured log line ──
        reqLogger.info({
            msg: "api_request",
            method,
            path,
            statusCode,
            durationMs,
            requestId,
            responseSizeBytes,
        });

        return outResponse;
    };
}
