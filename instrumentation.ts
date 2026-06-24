import * as Sentry from "@sentry/nextjs";
import { initializeWebhookHandlers } from "./lib/webhooks/init";

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Existing session validation
    const { validateSessionConfig } = await import('./lib/session');
    validateSessionConfig();

    // Initialize Sentry for the server
    const STELLAR_ADDRESS_REGEX = /G[A-Z2-7]{55}/g;
    const AMOUNT_REGEX = /\b\d+(\.\d+)?\s*(XLM|USDC|USD)\b/gi;
    const SESSION_TOKEN_REGEX = /"iron-session[^"]*":\s*"[^"]+"/gi;

    function scrubServerPII<T extends Sentry.Event>(event: T): T {
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

    // Initialize webhook handlers
    initializeWebhookHandlers();

    console.log('Instrumentation: Sentry (Server), Session Config, and Webhooks initialized');
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry for the edge
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
      release: process.env.SENTRY_RELEASE,
      tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === "production" ? 0.05 : 0.5,
    });
    console.log('Instrumentation: Sentry (Edge) initialized');
  }
}
