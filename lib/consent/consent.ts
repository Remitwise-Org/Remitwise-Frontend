/**
 * Analytics consent state manager.
 *
 * Implements a defence-in-depth consent layer that:
 * - Defaults to "denied" for EU locales (GDPR / ePrivacy compliance)
 * - Defaults to "granted" for non-EU locales
 * - Unconditionally denies consent when the Global Privacy Control (GPC) signal
 *   is active, regardless of cookie state or locale
 * - Persists user choice in a first-party cookie so the banner is not re-shown
 *
 * Threat mitigated: without this check, Sentry session replays and performance
 * tracing fire unconditionally — violating EU consent requirements and ignoring
 * the legally binding GPC signal.
 *
 * @see https://globalprivacycontrol.github.io/gpc-spec/
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cookie name used to persist the user's analytics consent choice. */
export const CONSENT_COOKIE_NAME = "rw-analytics-consent";

/** Consent values stored in the cookie. */
export type ConsentValue = "granted" | "denied";

/**
 * Resolved consent state returned by {@link getConsentState}.
 *
 * - `granted`   – user explicitly accepted, or non-EU default applies
 * - `denied`    – user explicitly declined, GPC is active, or EU default applies
 * - `undecided` – no cookie set and no GPC signal; the banner should be shown
 */
export type ConsentState = ConsentValue | "undecided";

/** Maximum cookie age: 180 days (seconds). */
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

/**
 * ISO 3166-1 alpha-2 country codes for EEA + UK + CH.
 * Used for locale-based EU heuristic detection.
 */
const EU_COUNTRY_CODES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA (non-EU)
  "IS", "LI", "NO",
  // Adequate / similar regulation
  "GB", "CH",
]);

// ---------------------------------------------------------------------------
// GPC detection
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the browser's Global Privacy Control signal is active.
 *
 * @see https://globalprivacycontrol.github.io/gpc-spec/
 */
export function isGpcEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { globalPrivacyControl?: boolean })
    .globalPrivacyControl === true;
}

// ---------------------------------------------------------------------------
// EU locale heuristic
// ---------------------------------------------------------------------------

/**
 * Best-effort EU detection based on `navigator.language` / `navigator.languages`.
 *
 * This is a heuristic — it cannot guarantee geographic location. It is
 * intentionally conservative: when in doubt, it returns `true` so the banner
 * is shown (erring on the side of user privacy).
 *
 * A locale like `de-DE`, `fr-FR`, or `pt-PT` will be detected as EU.
 * A bare locale like `en` (no region subtag) is treated as non-EU because
 * we cannot infer geography from the language alone.
 */
export function isEuLocale(): boolean {
  if (typeof navigator === "undefined") return false;

  const languages: readonly string[] =
    navigator.languages?.length > 0
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : [];

  for (const tag of languages) {
    // BCP 47: language-region, e.g. "de-DE", "pt-PT", "en-GB"
    const parts = tag.split("-");
    const region = parts.length >= 2 ? parts[parts.length - 1].toUpperCase() : null;
    if (region && EU_COUNTRY_CODES.has(region)) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Reads the consent cookie value from `document.cookie`.
 * Returns `null` if the cookie is absent or has an invalid value.
 */
export function readConsentCookie(): ConsentValue | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!match) return null;

  const value = match.split("=")[1];
  if (value === "granted" || value === "denied") return value;
  return null;
}

/**
 * Writes the consent cookie with SameSite=Lax, Secure (in production), and
 * a 180-day max-age.
 */
export function writeConsentCookie(value: ConsentValue): void {
  if (typeof document === "undefined") return;

  const secure =
    typeof window !== "undefined" && window.location?.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = [
    `${CONSENT_COOKIE_NAME}=${value}`,
    `max-age=${MAX_AGE_SECONDS}`,
    "path=/",
    "SameSite=Lax",
    secure,
  ]
    .filter(Boolean)
    .join("; ");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves the current analytics consent state.
 *
 * Resolution order:
 * 1. GPC enabled → always `"denied"` (no banner needed)
 * 2. Cookie present → cookie value
 * 3. EU locale → `"undecided"` (banner must be shown)
 * 4. Non-EU locale → `"granted"` (default-on)
 */
export function getConsentState(): ConsentState {
  // GPC takes absolute precedence — the spec requires that the signal be
  // honoured without requiring additional user interaction.
  if (isGpcEnabled()) return "denied";

  const cookie = readConsentCookie();
  if (cookie) return cookie;

  // No cookie set — apply locale-based default
  return isEuLocale() ? "undecided" : "granted";
}

/**
 * Records the user's consent choice.
 *
 * If GPC is active this is a no-op: the GPC signal supersedes any user
 * interaction and must always be treated as "denied".
 */
export function setConsent(value: ConsentValue): void {
  if (isGpcEnabled()) return;
  writeConsentCookie(value);
}

/**
 * Returns `true` when analytics may be initialised.
 * Convenience wrapper around {@link getConsentState}.
 */
export function isAnalyticsAllowed(): boolean {
  return getConsentState() === "granted";
}
