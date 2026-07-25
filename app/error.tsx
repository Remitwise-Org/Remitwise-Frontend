'use client';
import { errorReporter } from '../lib/client/errorReporter';

export default function RootErrorBoundary({ error }: { error: Error }) {
  // Report error with PII scrubbing handled by reporter
  errorReporter.captureException(error);

  return (
    <div>
      <h1>Something went wrong.</h1>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}
