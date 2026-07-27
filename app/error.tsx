'use client';
import { errorReporter } from '../lib/client/errorReporter';
import RootErrorFallback from '@/components/RootErrorFallback';

export default function RootErrorBoundary({ error, reset }: { error: Error, reset: () => void }) {
  // Report error with PII scrubbing handled by reporter
  errorReporter.captureException(error);

  return <RootErrorFallback onReset={reset} />;
}
