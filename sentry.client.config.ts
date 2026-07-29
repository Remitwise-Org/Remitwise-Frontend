import * as Sentry from "@sentry/nextjs";
import { isAnalyticsAllowed } from "@/lib/consent/consent";
import { safeRequestIdleCallback } from "@/lib/utils/idleCallback";

const STELLAR_ADDRESS_REGEX = /G[A-Z2-7]{55}/g;
const AMOUNT_REGEX = /\b\d+(\.\d+)?\s*(XLM|USDC|USD)\b/gi;

function scrubStellarPII<T extends Sentry.Event>(event: T): T {
  const str = JSON.stringify(event);
  const scrubbed = str
    .replace(STELLAR_ADDRESS_REGEX, "[STELLAR_ADDRESS]")
    .replace(AMOUNT_REGEX, "[AMOUNT]");
  return JSON.parse(scrubbed);
}

/**
 * Only initialise Sentry when analytics consent has been granted.
 *
 * Defence-in-depth: if the user has not consented (EU default-off) or if the
 * Global Privacy Control signal is active, no Sentry data is collected at all —
 * not even error reports that might include session replays or PII.
 *
 * @see lib/consent/consent.ts for the consent resolution logic
 *
 * Deferred to idle time (see lib/utils/idleCallback.ts) rather than run
 * synchronously at import time: setting up the SDK -- especially the
 * replay integration -- competes with hydration for the initial-load
 * main-thread budget otherwise.
 */
if (isAnalyticsAllowed()) {
  safeRequestIdleCallback(() => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

      tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === "production" ? 0.1 : 1.0,
      replaysSessionSampleRate: process.env.NEXT_PUBLIC_APP_ENV === "production" ? 0.05 : 0.5,
      replaysOnErrorSampleRate: 1.0,

      integrations: [Sentry.replayIntegration()],

      beforeSend(event) {
        return scrubStellarPII(event);
      },
    });
  });
}
