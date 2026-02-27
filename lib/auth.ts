import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";

/**
 * Structured API error for consistent error responses.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Validates Bearer token against AUTH_SECRET
 */
export function validateAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) return false;
  return token === process.env.AUTH_SECRET;
}

/**
 * Standard unauthorized JSON response
 */
export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Higher-order function that wraps a route handler with auth validation.
 * Supports:
 *  - Bearer token auth
 *  - Header-based session (x-user / x-stellar-public-key)
 *  - Cookie-based session
 */
export function withAuth(
  handler: (request: NextRequest, address: string) => Promise<Response> | Response,
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      // 1️⃣ Bearer token auth
      const authHeader = request.headers.get("authorization") ?? "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

      if (token && token === process.env.AUTH_SECRET) {
        return await handler(request, token);
      }

      // 2️⃣ Header-based session
      const headerAddress =
        request.headers.get("x-user") ??
        request.headers.get("x-stellar-public-key");

      if (headerAddress) {
        return await handler(request, headerAddress);
      }

      // 3️⃣ Cookie-based session
      try {
        const session = await getSession();
        if (session?.address) {
          return await handler(request, session.address);
        }
      } catch (sessionError) {
        console.debug("Session retrieval failed:", sessionError);
      }

      // ❌ Unauthorized
      return unauthorizedResponse();
    } catch (error) {
      if (error instanceof ApiError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: error.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.error("Route handler error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}