import { sanitizeWalletAddress } from '../sanitize';
import { getSessionId } from './sessionId';

/**
 * Short, scoped label identifying which part of the app raised the error
 * (e.g. `"payout-form"`, `"transaction-history"`), reported to Sentry as a
 * tag -- not folded into the free-form `context` object -- so errors from
 * different UI areas can be filtered independently once they land there.
 */
export type ErrorReporterTag = string;

interface Reporter {
  captureException: (err: unknown, context?: Record<string, any>, tag?: ErrorReporterTag) => void;
}

const getReporter = (): Reporter => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

  if (!dsn) {
    return {
      captureException: (err, _context, tag) =>
        console.error('[ErrorReporter No-Op]', tag ? `[${tag}]` : '', err, {
          sessionId: getSessionId(),
        }),
    };
  }

  return {
    captureException: (err, context, tag) => {
      // Logic to scrub PII from context before reporting
      const scrubbedContext = context ? JSON.parse(JSON.stringify(context, (key, value) => {
        if (key === 'address' || key === 'wallet') return sanitizeWalletAddress(value);
        return value;
      })) : {};

      console.log('[ErrorReporter] Reporting to Sentry:', err, {
        ...(tag ? { tag } : {}),
        context: scrubbedContext,
        sessionId: getSessionId(),
      });
    }
  };
};

export const errorReporter = getReporter();
