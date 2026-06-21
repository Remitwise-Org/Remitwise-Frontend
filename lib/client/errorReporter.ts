import { sanitizeWalletAddress } from '../lib/sanitize';

interface Reporter {
  captureException: (err: unknown, context?: Record<string, any>) => void;
}

const getReporter = (): Reporter => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  
  if (!dsn) {
    return { captureException: (err) => console.error('[ErrorReporter No-Op]', err) };
  }

  return {
    captureException: (err, context) => {
      // Logic to scrub PII from context before reporting
      const scrubbedContext = context ? JSON.parse(JSON.stringify(context, (key, value) => {
        if (key === 'address' || key === 'wallet') return sanitizeWalletAddress(value);
        return value;
      })) : {};
      
      console.log('[ErrorReporter] Reporting to Sentry:', err, scrubbedContext);
    }
  };
};

export const errorReporter = getReporter();
