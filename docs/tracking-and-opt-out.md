# Tracking, Cookies, and Telemetry Configuration

This document is written for **operators and deployment administrators** of the RemitWise platform. It details all cookies, local storage, session storage, and telemetry integrations used by the RemitWise frontend, why they are set, and how to disable or opt out of them.

---

## Browser Storage and Cookies

The application stores configuration and session identifiers in the user's browser to support authentication and UI customization. 

### Cookies

Cookies are exchanged on HTTP requests and are used for session security and locale hydration.

| Cookie Name | Scope / Access | Life-span | Purpose / Content | Operator Opt-Out / Configuration |
|---|---|---|---|---|
| `remitwise_session` | HTTP-Only, Lax, Secure (prod) | Configurable via `SESSION_MAX_AGE` (default: 7 days) | Encrypted JSON payload containing `{ address: string, createdAt: number, expiresAt: number }` to maintain user session. | Cannot be disabled for authenticated routes. Operators can customize session duration using `SESSION_MAX_AGE` in seconds. |
| `remitwise_locale` | JavaScript Accessible | 1 year | The user's selected language/locale preference (e.g., `en`, `es`). Used to render server-side translations. | Managed in the UI preferences. Operators cannot disable this without disabling multi-language support. |

#### Example: Session Duration Configuration
To set a custom session expiry of 2 hours, configure the environment variable:
```bash
SESSION_MAX_AGE=7200
```

---

### Local Storage (`localStorage`)

Local storage persists data across browser sessions and tab closures. It is read-only on the client side.

| Key | Life-span | Purpose | Opt-Out |
|---|---|---|---|
| `theme-preference` | Indefinite | Stores user visual theme choice (`dark` or `light`). | Cleared via developer tools or theme toggle in settings. |
| `display-density` | Indefinite | Stores user layout density choice (`comfortable` or `compact`). | Cleared via developer tools or layout selector in settings. |
| `redirect_after_auth` | Temporary | Stores the path the user visited before authentication to redirect them back after logging in. | Deleted automatically upon login redirection. |
| `session_expiry` | Temporary | Stores session expiry timestamp for client-side warning notifications. | Deleted automatically on logout. |
| `remitwise_whats_new_last_seen` | Indefinite | Tracks the latest seen feature announcement ID. | Managed automatically by the application. |
| `remitwise-tutorial-<id>` | Indefinite | Tracks completed chapters within the tutorial flow. | Managed automatically, or manually cleared in developer tools. |

---

### Session Storage (`sessionStorage`)

Session storage data persists only for the duration of the page session (as long as the browser tab is open).

| Key | Life-span | Purpose | Opt-Out |
|---|---|---|---|
| `remitwise_dev_mode` | Tab lifetime | Toggles the floating Request-ID panel display for developer troubleshooting. | Toggled off by appending `?dev=0` to the URL. |
| `remitwise_latest_request_id` | Tab lifetime | Holds the most recent API Response `X-Request-ID` header. | Clears automatically when the tab is closed. |

---

## Telemetry and Error Monitoring (Sentry)

RemitWise uses Sentry to capture client, server, and edge runtime exceptions.

### Privacy and PII Scrubbing

To prevent sensitive information exposure, Sentry events are sanitized before being transmitted to the ingestion server:
1. **Stellar Wallet Addresses**: Masked via regex match `G[A-Z2-7]{55}` replacing addresses with `[STELLAR_ADDRESS]`.
2. **Transaction Amounts**: Masked via regex match `\b\d+(\.\d+)?\s*(XLM|USDC|USD)\b` replacing values with `[AMOUNT]`.
3. **Session Tokens**: Server events redact the `iron-session` cookie signature.

---

### Operator Opt-Out / Configuration

Operators can fully disable Sentry telemetry by unsetting or leaving the Sentry DSN environment variables empty. When telemetry is disabled, the application falls back to a safe console logger.

#### Disabling Telemetry (No-Op Configuration)
Set the environment variables in your deployment environment as follows:
```env
# Disable Sentry monitoring
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_DSN=""
```

#### Verification Code Example
The application resolves the Sentry DSN programmatically. If none is supplied, the error reporter defaults to a no-op handler:

```typescript
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (!dsn) {
  // Graceful fallback when telemetry is disabled
  console.log("[Telemetry] Sentry DSN is empty. Sentry is disabled.");
} else {
  console.log("[Telemetry] Sentry initialized with DSN:", dsn);
}
```
