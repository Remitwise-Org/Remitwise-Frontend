import { generateRequestId } from '@/lib/requestId';
import { API_AUTHORIZATION_HEADER, API_REQUEST_ID_HEADER } from '@/lib/api/headers';

export { API_AUTHORIZATION_HEADER, API_REQUEST_ID_HEADER } from '@/lib/api/headers';

let authToken: string | null = null;

/**
 * Sets the credential injected into browser API requests. Passing `null` clears
 * it (for example, when a wallet disconnects). The supplied value may be a raw
 * token/public key or a complete `Bearer <token>` value.
 */
export function setApiClientAuthToken(token: string | null | undefined): void {
  const normalized = token?.trim();
  authToken = normalized || null;
}

function toBearerValue(token: string): string {
  return /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`;
}

/**
 * Adds the shared authentication and correlation headers to an API request.
 * Explicit caller-provided values always take precedence, which keeps existing
 * integrations backwards-compatible and allows support tooling to forward an
 * existing request ID.
 */
export function createApiRequestHeaders(headersInit?: HeadersInit): Headers {
  const headers = new Headers(headersInit);

  if (authToken && !headers.has(API_AUTHORIZATION_HEADER)) {
    headers.set(API_AUTHORIZATION_HEADER, toBearerValue(authToken));
  }

  if (!headers.has(API_REQUEST_ID_HEADER)) {
    headers.set(API_REQUEST_ID_HEADER, generateRequestId());
  }

  return headers;
}
