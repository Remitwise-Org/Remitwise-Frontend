# CSRF Protection

> **Audience:** Contributors working on authentication, API routes, or form
> submissions. Security reviewers auditing the defence-in-depth posture.

---

## Overview

Cross-Site Request Forgery (CSRF) is an attack where a malicious third-party
page tricks an authenticated user's browser into making an unwanted state-changing
request to RemitWise. If the attack succeeds, the attacker can transfer funds,
change settings, or perform any action the victim is authorised to perform —
without the victim's knowledge.

RemitWise defends against CSRF in two complementary layers:

1. **`SameSite` cookie attribute** — the primary defence (covered in depth below).
2. **Nonce-based wallet authentication** — a secondary property that renders most
   CSRF attacks harmless even if the cookie were ever sent cross-origin.

---

## Threat model

| Attacker goal | Pre-condition | Mitigated by |
|---|---|---|
| Trigger a state-changing API call (POST/PUT/PATCH/DELETE) as an authenticated user | User is logged in; attacker can embed a form or XHR on a page the user visits | `SameSite=Lax` cookie prevents the session cookie from being sent on cross-origin POST requests |
| Steal the session token | User visits a malicious page | `HttpOnly` flag on `remitwise_session` prevents JS access; `SameSite` prevents cross-origin submission |
| Forge a wallet-signature login | Attacker cannot read the server-generated nonce without same-origin access | Nonce-challenge/response requires the attacker to read a one-time value they cannot obtain |

---

## Primary defence: `SameSite=Lax` on `remitwise_session`

The session cookie is configured in `lib/session.ts`:

```typescript
// lib/session.ts
export function getSessionCookieHeader(sealed: string): string {
  const sessionMaxAge = getSessionMaxAge();
  return `${SESSION_COOKIE}=${sealed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAge}${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}
```

### Why `Lax` and not `Strict`?

`SameSite=Strict` would block the cookie from being sent on _any_ cross-site
navigation, including clicking a link from an external page to RemitWise. That
would force users to re-authenticate every time they arrive via an email link or
bookmark manager, which is an unacceptable UX regression.

`SameSite=Lax` is the right trade-off:

| Request type | `Lax` sends cookie? | Risk |
|---|---|---|
| Top-level `GET` navigation (link click, redirect) | ✅ Yes | No state change from a GET |
| Cross-site `<form method="POST">` | ❌ No | CSRF blocked |
| Cross-site XHR/fetch (`credentials: include`) | ❌ No | CSRF blocked |
| Same-origin request (any method) | ✅ Yes | Legitimate |

### What an attacker gets without this fix

Without `SameSite=Lax`, a malicious page could embed:

```html
<!-- on evil.example.com -->
<form method="POST" action="https://app.remitwise.com/api/send">
  <input name="recipient" value="ATTACKER_STELLAR_ADDRESS" />
  <input name="amountMinor" value="100000" />
</form>
<script>document.forms[0].submit();</script>
```

If the user had an active session, the browser would attach `remitwise_session`
to this forged request and the API route would treat it as legitimate. `SameSite=Lax`
closes this vector entirely.

---

## Secondary defence: nonce-based wallet authentication

Even for endpoints that accept mutations, RemitWise requires wallet ownership
proof before session creation (`POST /api/auth/login`):

1. Server issues a random 32-byte hex nonce (`POST /api/auth/nonce`).
2. The client's wallet signs the nonce with the user's Stellar private key.
3. The server verifies the signature before issuing a session cookie.

A CSRF attacker cannot replicate this handshake because:
- They cannot read the one-time nonce (same-origin policy blocks cross-origin reads).
- They cannot sign the nonce without the user's private key.

This means CSRF against the login endpoint is effectively impossible regardless
of the cookie policy.

---

## Additional hardening measures

### 1. Same-origin redirect enforcement

All client-side redirects (post-logout, post-auth, session-expiry) pass through
`safeRedirectPath()` in `lib/client/logout.ts` before the target URL is used:

```typescript
// lib/client/logout.ts
export function safeRedirectPath(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') return '/';
  // Must start with '/' but not '//' (protocol-relative)
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  // Catch any URL-encoded or embedded absolute URLs
  if (path.includes('://')) return '/';
  return path;
}
```

This prevents _open-redirect_ vulnerabilities where a crafted `?next=` or
`redirectTo` parameter could send the user to an attacker-controlled domain
after authentication.

### 2. Form state wiped on logout

On every logout and session-expiry event, `wipeClientState()` in
`lib/client/sessionHandler.ts` removes:

- All known auth-related `localStorage` keys (`wallet_address`, `wallet_connected`, etc.).
- All `localStorage` keys with the `remitwise_form_` prefix (catches dynamically-named draft entries).
- Known `sessionStorage` draft keys (`form_draft`, `transfer_draft`, `bill_draft`).

This ensures a subsequent user of the same browser session cannot access a prior
user's unsaved form data.

### 3. Sanitized search queries

Search queries read from URL params (`?q=`) pass through `sanitizeSearchQuery()`
in `lib/sanitize.ts` before being used in filtering or rendering:

```typescript
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';
  const withoutControlChars = query.replace(/[\x00-\x1F\x7F]/g, '');
  const collapsedWhitespace = withoutControlChars.replace(/\s+/g, ' ').trim();
  return collapsedWhitespace.slice(0, MAX_SEARCH_QUERY_LENGTH); // 200 chars
}
```

This removes CRLF injection characters that could corrupt HTTP log lines or
smuggle forged log entries, and caps the output at 200 characters.

### 4. Clipboard paste stripping

Text fields that accept free-form user input reject clipboard payloads that
contain HTML markup. The `sanitizePastedValue()` utility in
`lib/validation/sanitizePaste.ts` is applied in `onPaste` handlers:

```typescript
// lib/validation/sanitizePaste.ts
export function sanitizePastedValue(
  clipboardData: DataTransfer,
  currentValue: string,
  selectionStart: number,
  selectionEnd: number
): string {
  const pasted = stripHtml(clipboardData.getData("text/plain"));
  return currentValue.slice(0, selectionStart) + pasted + currentValue.slice(selectionEnd);
}
```

Although `<input>` and `<textarea>` elements render plain text only, a
clipboard payload that carries an HTML MIME type can include raw tag markup
as its plain-text representation on some clipboard managers. Stripping the
tags before insertion prevents literal `<script>` text from reaching field
values that are later echoed into the DOM or sent to the server.

---

## Content Security Policy synergy

The nonce-based CSP declared in `middleware.ts` and documented in
[docs/SECURITY.md](SECURITY.md) provides a complementary XSS barrier. Even if
an injected script somehow reached the DOM, the browser would refuse to execute
it without a valid per-request nonce. Because CSRF tokens and XSS both exploit
the trust relationship between browser and origin, a strong CSP reduces the
attack surface CSRF would need to be combined with.

---

## Where CSRF tokens are **not** needed

RemitWise does not implement a separate CSRF token header (e.g.
`X-CSRF-Token`) because:

1. `SameSite=Lax` provides equivalent cross-origin POST protection for all
   modern browsers (>98% global usage as of 2025).
2. The wallet-signature login flow already requires round-trip proof of key
   ownership, making a CSRF attack against authentication infeasible.
3. All API mutations are performed with `Content-Type: application/json`, which
   browsers treat as a non-simple request and therefore block for cross-origin
   callers without an explicit CORS pre-flight — and RemitWise's CORS policy
   restricts `Access-Control-Allow-Origin` to the configured `ALLOWED_ORIGINS`
   list (see `middleware.ts`).

If a future integration ever requires `SameSite=None` cookies (e.g. embedded
iframe flows), a synchronised CSRF token should be added at that point.

---

## Testing

| Test file | What it covers |
|---|---|
| `tests/unit/logout-client.test.ts` | `safeRedirectPath` rejects absolute and protocol-relative URLs |
| `tests/unit/sessionHandler.test.ts` | `wipeClientState` clears auth and form-state storage |
| `tests/unit/sanitize.test.ts` | `sanitizeSearchQuery` strips control chars and caps length |
| `tests/unit/validation/sanitizePaste.test.ts` | `stripHtml` and `sanitizePastedValue` |
| `tests/unit/goals/SavingsGoalModal-paste.test.tsx` | HTML clipboard paste is stripped on the description textarea |
| `tests/unit/search-page.test.tsx` | Search page sanitizes the `?q=` param before rendering |

---

## Related documentation

- [docs/SECURITY.md](SECURITY.md) — Content Security Policy and XSS hardening.
- [docs/COOKIE_HANDLING.md](COOKIE_HANDLING.md) — Full cookie inventory with `SameSite` rationale.
- [docs/AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md) — Nonce challenge-response login flow.
- [docs/frontend-session-handling.md](frontend-session-handling.md) — Session lifecycle and expiry flow.
