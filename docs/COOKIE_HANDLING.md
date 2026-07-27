# Cookie Handling

This document describes every first-party cookie that RemitWise sets: where it is written, what flags are applied, and why those choices were made. Audience: **contributors** who need to change auth, i18n, or analytics behaviour, and security reviewers who want to verify the defence-in-depth posture.

---

## Cookie inventory

| Cookie name | Set by | `HttpOnly` | `SameSite` | `Secure` | `Max-Age` | Purpose |
|---|---|---|---|---|---|---|
| `remitwise_session` | Server (`lib/session.ts`) | ✅ Yes | `Lax` | Production only | Configurable (default 7 days) | Encrypted wallet session (iron-session) |
| `remitwise_locale` | Client (`lib/i18n/cookie.ts`) | ❌ No | `Lax` | ❌ Never | 365 days | UI language preference |
| `rw-analytics-consent` | Client (`lib/consent/consent.ts`) | ❌ No | `Lax` | When served over HTTPS | 180 days | User analytics opt-in/out |

---

## `remitwise_session`

**Source:** `lib/session.ts`

This is the primary authentication cookie. It stores a sealed [iron-session](https://github.com/vvo/iron-session) payload containing the user's Stellar wallet address, `createdAt`, and `expiresAt` timestamps. The payload is encrypted and integrity-protected with `SESSION_PASSWORD` (minimum 32 characters).

### Cookie attributes

| Attribute | Value | Rationale |
|---|---|---|
| `HttpOnly` | Yes | Prevents JavaScript from reading the session token; mitigates XSS-based session theft. |
| `SameSite` | `Lax` | Blocks CSRF on cross-site POST requests while still allowing top-level navigations (e.g., OAuth redirects) to carry the cookie. |
| `Secure` | `NODE_ENV === 'production'` | Enforces TLS in production; omitted in local dev so plain HTTP works. |
| `Path` | `/` | Cookie is sent on all routes. |
| `Max-Age` | `SESSION_MAX_AGE` env var (default `604800` — 7 days) | Session expires server-side via `expiresAt` regardless of the `Max-Age`, so the two clocks are independently enforced. |

### Where it is written

```typescript
// lib/session.ts — cookie set after successful login
export function getSessionCookieHeader(sealed: string): string {
  const sessionMaxAge = getSessionMaxAge();
  return `${SESSION_COOKIE}=${sealed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAge}${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}
```

Sliding-window refresh re-sets the cookie via `next/headers` `cookies().set(...)` with the same flags:

```typescript
cookieStore.set({
  name: SESSION_COOKIE,   // 'remitwise_session'
  value: sealed,
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  maxAge: sessionMaxAge,
  secure: process.env.NODE_ENV === 'production',
});
```

### Clearing the cookie

On logout or 401, the cookie is cleared by setting `Max-Age=0`:

```typescript
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}
```

### Refresh behaviour

When `SESSION_REFRESH_ENABLED=true` the sliding window is extended on every authenticated request. The refreshed cookie is written through `getSessionWithRefresh()` in `lib/session.ts`. When the env var is absent or `false`, sessions are fixed-window and expire at `expiresAt` without renewal.

### Threat model note

Without `HttpOnly`, XSS can exfiltrate the session token directly from `document.cookie`. The flag closes that vector. `SameSite=Lax` (rather than `None`) prevents the token from being attached to cross-origin sub-resource requests, blocking CSRF attacks that would otherwise allow an attacker's site to make authenticated API calls on behalf of the victim.

---

## `remitwise_locale`

**Source:** `lib/i18n/cookie.ts`

Stores the user's chosen UI language (`en` or `es`). This preference is read by both the server (via `NextRequest.cookies`) and the client (via `document.cookie`) to resolve the active locale before rendering.

### Cookie attributes

| Attribute | Value | Rationale |
|---|---|---|
| `HttpOnly` | **No** | Client-side code needs to read and update the locale when the user switches language without a full page reload. |
| `SameSite` | `Lax` | Standard same-site protection; locale is non-sensitive. |
| `Secure` | **No** | Language preference carries no secret; omitting `Secure` avoids breakage on non-TLS development environments and is acceptable given the data is non-sensitive. |
| `Path` | `/` | Applies to all routes. |
| `Max-Age` | `31 536 000` (365 days) | Long lifetime mirrors a typical user preference — the banner to re-prompt is not shown until the cookie expires or is cleared. |

### Where it is written

```typescript
// lib/i18n/cookie.ts
export function setLocaleCookie(locale: SupportedLocale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}
```

Supported values are `"en"` and `"es"`. Any other value is rejected by `isValidLocale()` and treated as if no cookie were present.

---

## `rw-analytics-consent`

**Source:** `lib/consent/consent.ts`

Persists the user's analytics opt-in or opt-out choice (`"granted"` or `"denied"`). The flag drives whether Sentry replays and performance tracing are initialised.

### Cookie attributes

| Attribute | Value | Rationale |
|---|---|---|
| `HttpOnly` | **No** | The consent banner and Sentry initialisation code run client-side and must be able to read the stored choice without a round-trip. |
| `SameSite` | `Lax` | Standard protection for a first-party preference cookie. |
| `Secure` | When `window.location.protocol === 'https:'` | Added dynamically: set on HTTPS deployments, absent on local HTTP dev. |
| `Path` | `/` | Applies site-wide. |
| `Max-Age` | `15 552 000` (180 days) | Matches typical GDPR re-consent windows; the banner is re-shown after this period. |

### Where it is written

```typescript
// lib/consent/consent.ts
export function writeConsentCookie(value: ConsentValue): void {
  if (typeof document === 'undefined') return;

  const secure =
    typeof window !== 'undefined' && window.location?.protocol === 'https:'
      ? '; Secure'
      : '';

  document.cookie = [
    `${CONSENT_COOKIE_NAME}=${value}`,   // 'rw-analytics-consent'
    `max-age=${MAX_AGE_SECONDS}`,        // 180 days
    'path=/',
    'SameSite=Lax',
    secure,
  ]
    .filter(Boolean)
    .join('; ');
}
```

### Consent resolution order

1. **GPC signal active** → always `"denied"` (no user interaction required; legally binding under GPC spec).
2. **Cookie present** → use stored value (`"granted"` or `"denied"`).
3. **No cookie, EU locale detected** → `"undecided"` (show the consent banner).
4. **No cookie, non-EU locale** → `"granted"` (opt-in by default).

This is implemented in `getConsentState()` in `lib/consent/consent.ts`.

---

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `SESSION_PASSWORD` | `lib/session.ts` | **Required.** Minimum 32 characters. Generate with `openssl rand -base64 32`. |
| `SESSION_MAX_AGE` | `lib/session.ts` | Optional. Integer seconds. Defaults to `604800` (7 days). |
| `SESSION_REFRESH_ENABLED` | `lib/session.ts` | `"true"` enables sliding-window refresh. Defaults to disabled. |
| `NODE_ENV` | `lib/session.ts` | Set to `"production"` by Next.js in production builds; controls the `Secure` flag on `remitwise_session`. |

---

## Related documentation

- [Frontend Session Handling](frontend-session-handling.md) — session lifecycle, 401 handling, and logout flow.
- [Tracking and Opt-Out Guide](tracking-and-opt-out.md) — Sentry configuration and consent-gated tracing.
- [Security](SECURITY.md) — overall security posture and responsible disclosure.
- [Auth Implementation](AUTH_IMPLEMENTATION.md) — wallet-based nonce challenge-response flow.
