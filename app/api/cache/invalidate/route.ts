import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin/auth";
import {
  checkIdempotency,
  storeIdempotentResponse,
} from "@/lib/idempotency/middleware";
import {
  invalidate,
  invalidatePattern,
  clearCache,
  getCacheStats,
  getCacheKeys,
  CacheError,
  CacheErrorCode,
} from "@/lib/cache/contract-cache";

// Maximum request body size (prevent DoS)
const MAX_BODY_SIZE = 10240; // 10KB

/**
 * Validates request body size
 * @security Prevents DoS via large payloads
 */
async function validateRequestBody(request: NextRequest): Promise<unknown> {
  const text = await request.text();

  if (text.length > MAX_BODY_SIZE) {
    throw new Error(
      `Request body exceeds maximum size of ${MAX_BODY_SIZE} bytes`,
    );
  }

  if (!text.trim()) {
    throw new Error("Request body is empty");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
}

/**
 * POST /api/cache/invalidate
 *
 * Allows manual cache invalidation for testing and debugging.
 *
 * @security Protected with admin authentication
 * @security Idempotency check for safe retries
 */
export async function POST(request: NextRequest) {
  // Authorization: Only admins can invalidate cache
  if (!isAdminAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    // Validate and parse request body
    const body = await validateRequestBody(request);

    // Idempotency check for safe retries and concurrent execution
    const cachedResponse = await checkIdempotency(request, body);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Type guard for body
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must be a JSON object",
        },
        { status: 400 },
      );
    }

    const typedBody = body as Record<string, unknown>;
    let response: NextResponse;

    // Clear all cache
    if (typedBody.clearAll === true) {
      clearCache();
      response = NextResponse.json({
        success: true,
        message: "Cache cleared completely",
        stats: getCacheStats(),
      });
    }

    // Pattern-based invalidation
    else if (typeof typedBody.pattern === "string") {
      try {
        const count = invalidatePattern(typedBody.pattern);
        response = NextResponse.json({
          success: true,
          message: `Invalidated ${count} cache entries matching pattern`,
          pattern: typedBody.pattern,
          count,
          stats: getCacheStats(),
        });
      } catch (error) {
        if (error instanceof CacheError) {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
              code: error.code,
            },
            { status: 400 },
          );
        }
        throw error;
      }
    }

    // Specific invalidation
    else if (typeof typedBody.contractId === "string") {
      try {
        if (typeof typedBody.method === "string") {
          // Validate args if provided
          const args =
            typedBody.args &&
            typeof typedBody.args === "object" &&
            !Array.isArray(typedBody.args)
              ? (typedBody.args as Record<string, unknown>)
              : {};

          // Invalidate specific method call
          const existed = invalidate(
            typedBody.contractId,
            typedBody.method,
            args,
          );
          response = NextResponse.json({
            success: true,
            message: existed
              ? "Cache entry invalidated"
              : "Cache entry not found",
            contractId: typedBody.contractId,
            method: typedBody.method,
            args,
            existed,
            stats: getCacheStats(),
          });
        } else {
          // Invalidate all methods for a contract
          const count = invalidatePattern(typedBody.contractId);
          response = NextResponse.json({
            success: true,
            message: `Invalidated ${count} cache entries for contract`,
            contractId: typedBody.contractId,
            count,
            stats: getCacheStats(),
          });
        }
      } catch (error) {
        if (error instanceof CacheError) {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
              code: error.code,
              details: error.details,
            },
            { status: 400 },
          );
        }
        throw error;
      }
    }

    // No valid operation specified
    else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request. Provide clearAll, pattern, or contractId",
          validOperations: {
            clearAll: "boolean - Clear entire cache",
            pattern: "string - Invalidate entries matching pattern",
            contractId:
              "string - Invalidate entries for contract (optionally with method and args)",
          },
        },
        { status: 400 },
      );
    }

    // Store successful response for idempotency
    if (response.status >= 200 && response.status < 300) {
      storeIdempotentResponse(request, body, {
        status: response.status,
        body: await response.clone().json(),
      });
    }

    return response;
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.message.includes("Request body")) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    // Handle unexpected errors
    // In production, log to monitoring system without exposing details
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        // Only include details in development
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cache/invalidate
 *
 * Returns cache statistics and keys for debugging.
 *
 * @security Protected with admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authorization: Only admins can view cache stats. Keep the authorization
    // check inside the failure boundary so unexpected auth errors are returned
    // as a controlled 500 rather than escaping the route handler.
    if (!isAdminAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const stats = getCacheStats();

    // Check if keys should be included (query param)
    const { searchParams } = new URL(request.url);
    const includeKeys = searchParams.get("includeKeys") === "true";

    // In production, consider restricting key listing
    const keys =
      includeKeys && process.env.NODE_ENV === "development"
        ? getCacheKeys()
        : undefined;

    return NextResponse.json({
      success: true,
      stats,
      ...(keys && {
        keys,
        keysCount: keys.length,
      }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get cache stats",
        // Only include details in development
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      },
      { status: 500 },
    );
  }
}
