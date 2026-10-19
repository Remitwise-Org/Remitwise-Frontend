/**
 * SEP-10 auth-issuer configuration.
 *
 * This app is its own SEP-10 WEB_AUTH_ENDPOINT issuer -- the value
 * published in stellar.toml (see `app/.well-known/stellar.toml/route.ts`)
 * telling wallets/anchors where to request a challenge from this site.
 *
 * `NEXT_PUBLIC_AUTH_ISSUER_URL` is browser-visible so client code (and the
 * toml route) can reference the same value without re-deriving it.
 * `STELLAR_WEB_AUTH_ENDPOINT` is kept as a server-only fallback for existing
 * deployments that only set that name.
 */
export function getAuthIssuerUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_AUTH_ISSUER_URL || process.env.STELLAR_WEB_AUTH_ENDPOINT;
  if (explicit) return explicit;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/api/auth`;
}

export const AUTH_ISSUER_URL = getAuthIssuerUrl();
