import { NextRequest, NextResponse } from "next/server";
import { LRUCache } from "lru-cache";

// In-memory metrics store
const metrics: Record<string, { count: number; errorCount: number }> = {};

// CORS & SECURITY CONFIGURATION
const CORS_ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
];
const CORS_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
];
const MAX_BODY_SIZE = parseInt(process.env.API_MAX_BODY_SIZE || "1048576", 10); // Default 1MB

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

// Helper functions
function applyCORS(response: NextResponse, request: NextRequest): void {
  const allowedOrigin =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const requestOrigin = request.headers.get("origin");
  const isSameOrigin = !requestOrigin || requestOrigin === allowedOrigin;
  if (isSameOrigin || requestOrigin === allowedOrigin) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      requestOrigin || allowedOrigin,
    );
  }
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    CORS_ALLOWED_METHODS.join(", "),
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    CORS_ALLOWED_HEADERS.join(", "),
  );
  response.headers.set("Vary", "Origin");
}

function applySecurityHeaders(response: NextResponse): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

async function validateBodySize(
  request: NextRequest,
  maxSize: number = MAX_BODY_SIZE,
): Promise<{ valid: boolean; error?: NextResponse }> {
  const methodsToValidate = ["POST", "PUT", "PATCH"];
  if (!methodsToValidate.includes(request.method)) {
    return { valid: true };
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxSize) {
    return {
      valid: false,
      error: new NextResponse(
        JSON.stringify({
          error: "Payload Too Large",
          message: `Request body exceeds maximum size of ${maxSize} bytes.`,
        }),
        {
          status: 413,
          headers: { "Content-Type": "application/json" },
        },
      ),
    };
  }
  if (!contentLength) {
    try {
      const bodyBuffer = await request.arrayBuffer();
      if (bodyBuffer.byteLength > maxSize) {
        return {
          valid: false,
          error: new NextResponse(
            JSON.stringify({
              error: "Payload Too Large",
              message: `Request body exceeds maximum size of ${maxSize} bytes.`,
            }),
            {
              status: 413,
              headers: { "Content-Type": "application/json" },
            },
          ),
        };
      }
    } catch {
      return { valid: true };
    }
  }
  return { valid: true };
}

// RATE LIMITING CONFIGURATION
const RATE_LIMITS = {
  auth: 10,
  write: 50,
  general: 100,
};
const rateLimitCache = new LRUCache<
  string,
  { count: number; expiresAt: number }
>({
  max: 10000,
  ttl: 60 * 1000,
});

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const method = request.method;
  const url = request.nextUrl.pathname;
  const requestId = Math.random().toString(36).substring(2, 10);

  // Extract IP or fallback for key
  const forwardedFor = request.headers.get("x-forwarded-for");
  let ip = "127.0.0.1";
  if (forwardedFor) {
    ip = forwardedFor.split(",")[0].trim();
  } else {
    const remoteAddr = request.headers.get("x-real-ip");
    if (remoteAddr) {
      ip = remoteAddr;
    }
  }

  // Whitelist test environments (Playwright E2E)
  if (
    request.headers.get("x-playwright-test") === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return NextResponse.next();
  }

  // Whitelist Health Check
  if (url === "/api/health" || url.startsWith("/api/health/")) {
    return NextResponse.next();
  }

  // CORS & Security headers early
  let apiResponse: NextResponse;
  let statusCode = 200;
  let error = false;

  apiResponse = NextResponse.next();
  applyCORS(apiResponse, request);
  applySecurityHeaders(apiResponse);

  // Handle CORS OPTIONS preflight requests
  if (method === "OPTIONS") {
    const preflightResponse = new NextResponse(null, { status: 204 });
    applyCORS(preflightResponse, request);
    applySecurityHeaders(preflightResponse);
    return preflightResponse;
  }

  // Validate request body size
  const bodySizeValidation = await validateBodySize(request);
  if (!bodySizeValidation.valid && bodySizeValidation.error) {
    applyCORS(bodySizeValidation.error, request);
    applySecurityHeaders(bodySizeValidation.error);
    return bodySizeValidation.error;
  }

  // Rate limiting
  let limit = RATE_LIMITS.general;
  let limitType = "general";
  if (url.startsWith("/api/auth/")) {
    limit = RATE_LIMITS.auth;
    limitType = "auth";
  } else if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    limit = RATE_LIMITS.write;
    limitType = "write";
  }
  const cacheKey = `${ip}:${limitType}`;
  const now = Date.now();
  const tokenRecord = rateLimitCache.get(cacheKey) || {
    count: 0,
    expiresAt: now + 60000,
  };
  if (now > tokenRecord.expiresAt) {
    tokenRecord.count = 0;
    tokenRecord.expiresAt = now + 60000;
  }
  tokenRecord.count += 1;
  rateLimitCache.set(cacheKey, tokenRecord);
  if (tokenRecord.count > limit) {
    const retryAfter = Math.ceil(
      (tokenRecord.expiresAt - now) / 1000,
    ).toString();
    const rateLimitError = new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: "Rate limit exceeded.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter,
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": tokenRecord.expiresAt.toString(),
        },
      },
    );
    applyCORS(rateLimitError, request);
    applySecurityHeaders(rateLimitError);
    // Log metrics for rate limit errors
    const durationMs = Date.now() - start;
    const key = `${method} ${url}`;
    if (!metrics[key]) metrics[key] = { count: 0, errorCount: 0 };
    metrics[key].count++;
    metrics[key].errorCount++;
    console.log(
      JSON.stringify({
        requestId,
        method,
        path: url,
        statusCode: 429,
        durationMs,
        timestamp: new Date().toISOString(),
      }),
    );
    rateLimitError.headers.set("X-Request-ID", requestId);
    return rateLimitError;
  }

  // Add rate limit headers to response
  apiResponse.headers.set("X-RateLimit-Limit", limit.toString());
  apiResponse.headers.set(
    "X-RateLimit-Remaining",
    (limit - tokenRecord.count).toString(),
  );
  apiResponse.headers.set(
    "X-RateLimit-Reset",
    tokenRecord.expiresAt.toString(),
  );

  // Metrics logging
  const durationMs = Date.now() - start;
  const key = `${method} ${url}`;
  if (!metrics[key]) metrics[key] = { count: 0, errorCount: 0 };
  metrics[key].count++;
  if (statusCode >= 400) metrics[key].errorCount++;
  console.log(
    JSON.stringify({
      requestId,
      method,
      path: url,
      statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
    }),
  );
  apiResponse.headers.set("X-Request-ID", requestId);

  return apiResponse;
}

export { metrics };

export const config = {
  matcher: "/api/:path*",
};