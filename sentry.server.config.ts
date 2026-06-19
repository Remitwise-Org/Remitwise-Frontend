import * as Sentry from "@sentry/nextjs";

const STELLAR_ADDRESS_REGEX = /G[A-Z2-7]{55}/g;
const AMOUNT_REGEX = /\b\d+(\.\d+)?\s*(XLM|USDC|USD)\b/gi;
const SESSION_TOKEN_REGEX = /"iron-session[^"]*":\s*"[^"]+"/gi;

function scrubServerPII(event: Sentry.Event): Sentry.Event {
  const str = JSON.stringify(event);
  const scrubbed = str
    .replace(STELLAR_ADDRESS_REGEX, "[STELLAR_ADDRESS]")
    .replace(AMOUNT_REGEX, "[AMOUNT]")
    .replace(SESSION_TOKEN_REGEX, '"iron-session":"[REDACTED]"');
  return JSON.parse(scrubbed);
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  release: process.env.SENTRY_RELEASE,

  tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === "production" ? 0.1 : 1.0,

  beforeSend(event) {
    return scrubServerPII(event);
  },
});
