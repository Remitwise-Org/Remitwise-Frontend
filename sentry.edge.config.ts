import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  release: process.env.SENTRY_RELEASE,

  tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === "production" ? 0.05 : 0.5,
});
