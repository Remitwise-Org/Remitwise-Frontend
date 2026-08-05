/**
 * Per-tab client session identifier, for correlating client-side logs
 * without persisting any user-identifying information.
 *
 * Generated once per browser tab and stored in `sessionStorage`, so it
 * survives reloads within the same tab but resets for a new tab/window --
 * unlike `localStorage`, it is never shared across tabs or persisted after
 * the tab closes.
 */

const SESSION_ID_KEY = "rw_session_id";

function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `sess-${timestamp}-${random}`;
}

let cachedSessionId: string | undefined;

/**
 * Returns the current tab's session ID, creating and persisting one on
 * first call. Returns `undefined` when called outside a browser (SSR) --
 * callers should omit the field rather than log a placeholder.
 */
export function getSessionId(): string | undefined {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return undefined;
  }

  if (cachedSessionId) {
    return cachedSessionId;
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) {
      cachedSessionId = existing;
      return cachedSessionId;
    }

    const created = generateSessionId();
    window.sessionStorage.setItem(SESSION_ID_KEY, created);
    cachedSessionId = created;
    return cachedSessionId;
  } catch {
    // Private-browsing modes or storage quota errors -- fall back to an
    // in-memory-only ID for the lifetime of this page load.
    cachedSessionId = cachedSessionId ?? generateSessionId();
    return cachedSessionId;
  }
}
