/**
 * tests/api-logger.test.ts
 *
 * Unit tests for structured API logging middleware.
 *
 * Run with:  npx tsx --test tests/api-logger.test.ts
 *   or:     node --loader tsx --test tests/api-logger.test.ts
 *
 * These tests validate the core security guarantees:
 *   1. Secrets (passwords, tokens, authorization, cookies) are NEVER logged.
 *   2. A requestId is generated when the incoming request has none.
 *   3. The requestId is propagated on the response header.
 *   4. Log output is valid structured JSON with the expected schema.
 *   5. Sanitisation helpers redact correctly.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── 1. Sanitisation helper tests ──────────────────────────────────────────

import {
    sanitizeAddress,
    sanitizeEmail,
} from "../lib/api-logger-middleware";

describe("sanitizeAddress", () => {
    it("returns first 6 chars of an address", () => {
        assert.equal(sanitizeAddress("GABCDEFGHIJKLMNOP"), "GABCDE");
    });

    it("returns undefined for null / empty input", () => {
        assert.equal(sanitizeAddress(null), undefined);
        assert.equal(sanitizeAddress(""), undefined);
        assert.equal(sanitizeAddress(undefined), undefined);
    });
});

describe("sanitizeEmail", () => {
    it("returns only the domain part", () => {
        assert.equal(sanitizeEmail("user@example.com"), "example.com");
    });

    it("returns undefined for malformed / empty input", () => {
        assert.equal(sanitizeEmail(null), undefined);
        assert.equal(sanitizeEmail("no-at-sign"), undefined);
        assert.equal(sanitizeEmail(""), undefined);
    });
});

// ─── 2. Log-output contract tests ─────────────────────────────────────────

/**
 * We capture pino's stdout output by temporarily monkey-patching
 * process.stdout.write. This lets us inspect the raw JSON log line
 * emitted by withApiLogger without relying on implementation details.
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiLogger } from "../lib/api-logger-middleware";
import logger from "../lib/logger";

/** Wait for one event-loop tick so pino's async SonicBoom can flush. */
function tick(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}

/** Capture all stdout writes during `fn` execution and return them. */
async function captureStdout(fn: () => Promise<void>): Promise<string[]> {
    const lines: string[] = [];
    const original = process.stdout.write.bind(process.stdout);

    process.stdout.write = ((
        chunk: string | Uint8Array,
        encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
        cb?: (err?: Error | null) => void,
    ): boolean => {
        lines.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
        // still write so debugging is easier
        if (typeof encodingOrCb === "function") {
            return original(chunk, encodingOrCb);
        }
        return original(chunk, encodingOrCb, cb);
    }) as typeof process.stdout.write;

    try {
        await fn();
        // Pino uses SonicBoom which writes asynchronously. Flush and
        // wait a tick to ensure the log line is captured by the patch.
        logger.flush();
        await tick();
    } finally {
        process.stdout.write = original;
    }
    return lines;
}

/** Build a minimal NextRequest for testing. */
function buildRequest(
    url: string,
    options: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
    } = {},
): NextRequest {
    const init: {
        method: string;
        headers: Record<string, string>;
        body?: string;
    } = {
        method: options.method ?? "GET",
        headers: options.headers ?? {},
    };
    if (options.body && options.method !== "GET") {
        init.body = options.body;
    }
    return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("withApiLogger", () => {
    it("emits structured JSON with the correct schema", async () => {
        const handler = withApiLogger(async () =>
            NextResponse.json({ ok: true }, { status: 200 }),
        );

        const lines = await captureStdout(async () => {
            await handler(
                buildRequest("/api/health"),
                { params: Promise.resolve({}) },
            );
        });

        // Find the api_request log line
        const logLine = lines
            .map((l) => {
                try {
                    return JSON.parse(l);
                } catch {
                    return null;
                }
            })
            .find((obj) => obj?.msg === "api_request");

        assert.ok(logLine, "Expected an 'api_request' log line to be emitted");
        assert.equal(logLine.method, "GET");
        assert.equal(logLine.path, "/api/health");
        assert.equal(logLine.statusCode, 200);
        assert.equal(typeof logLine.durationMs, "number");
        assert.equal(typeof logLine.requestId, "string");
        assert.ok(logLine.requestId.length > 0, "requestId must not be empty");
        // responseSizeBytes may be null when Content-Length is absent
        assert.ok(
            logLine.responseSizeBytes === null || typeof logLine.responseSizeBytes === "number",
            "responseSizeBytes must be number or null",
        );
    });

    // ── requestId generation ──────────────────────────────────────────

    it("generates requestId when x-request-id header is absent", async () => {
        const handler = withApiLogger(async () =>
            NextResponse.json({ ok: true }),
        );

        let response!: Response;
        await captureStdout(async () => {
            response = await handler(
                buildRequest("/api/test"),
                { params: Promise.resolve({}) },
            );
        });

        const returnedId = response.headers.get("x-request-id");
        assert.ok(returnedId, "Response must include x-request-id header");
        assert.ok(returnedId.length > 0, "Generated requestId must not be empty");
    });

    it("forwards client-supplied x-request-id", async () => {
        const handler = withApiLogger(async () =>
            NextResponse.json({ ok: true }),
        );

        const customId = "client-corr-id-12345";
        let response!: Response;
        await captureStdout(async () => {
            response = await handler(
                buildRequest("/api/test", {
                    headers: { "x-request-id": customId },
                }),
                { params: Promise.resolve({}) },
            );
        });

        assert.equal(
            response.headers.get("x-request-id"),
            customId,
            "Must propagate client-supplied requestId",
        );
    });

    // ── Security: secrets are NEVER logged ────────────────────────────

    it("NEVER logs request body, authorization, cookies, passwords, tokens, or secrets", async () => {
        const sensitivePayload = JSON.stringify({
            password: "hunter2",
            token: "eyJhbGciOiJIUz",
            secret: "super-secret-key",
            signature: "abc123sig",
            email: "user@example.com",
            address: "GABCDEFGHIJKLMNOP",
        });

        const sensitiveHeaders: Record<string, string> = {
            authorization: "Bearer super-secret-token",
            cookie: "session=abc123",
            "x-api-key": "secret-api-key",
        };

        const handler = withApiLogger(async () =>
            NextResponse.json({ result: "ok" }),
        );

        const lines = await captureStdout(async () => {
            await handler(
                buildRequest("/api/auth/login", {
                    method: "POST",
                    headers: {
                        ...sensitiveHeaders,
                        "content-type": "application/json",
                    },
                    body: sensitivePayload,
                }),
                { params: Promise.resolve({}) },
            );
        });

        const allOutput = lines.join("\n");

        // These values must NEVER appear in log output
        const forbidden = [
            "hunter2",          // password value
            "super-secret-key", // secret value
            "abc123sig",        // signature value
            "eyJhbGciOiJIUz",  // token value
            "super-secret-token", // authorization bearer token
            "session=abc123",   // cookie value
            "secret-api-key",   // API key
            '"password"',       // password field name in log
            '"authorization"',  // authorization header in log
            '"cookie"',         // cookie header in log
            "user@example.com", // full email (only domain should be logged, if at all)
            "GABCDEFGHIJKLMNOP", // full address (only prefix should be logged, if at all)
        ];

        for (const value of forbidden) {
            assert.ok(
                !allOutput.includes(value),
                `Log output must NEVER contain: ${value}`,
            );
        }
    });

    it("does NOT log query parameters", async () => {
        const handler = withApiLogger(async () =>
            NextResponse.json({ ok: true }),
        );

        const lines = await captureStdout(async () => {
            await handler(
                buildRequest("/api/search?q=secret-query&token=abc123"),
                { params: Promise.resolve({}) },
            );
        });

        const logLine = lines
            .map((l) => {
                try {
                    return JSON.parse(l);
                } catch {
                    return null;
                }
            })
            .find((obj) => obj?.msg === "api_request");

        assert.ok(logLine, "Expected log line");
        assert.equal(logLine.path, "/api/search", "Path must NOT include query params");
        assert.ok(
            !lines.join("").includes("secret-query"),
            "Query param values must never appear in logs",
        );
    });
});
