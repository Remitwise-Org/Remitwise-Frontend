import { NextRequest } from "next/server";

/**
 * Validates the Authorization header.
 * Expects:  Authorization: Bearer <token>
 * The token is checked against the AUTH_SECRET env variable.
 */
export function validateAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) return false;
  return token === process.env.AUTH_SECRET;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
