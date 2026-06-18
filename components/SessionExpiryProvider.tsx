'use client';

import { useSessionExpiry } from '@/lib/client/useSessionExpiry';
import SessionExpiryNotification from './SessionExpiryNotification';

/**
 * Session expiry provider component
 * Wraps the application to provide global session expiry notifications
 * Handles both warning (countdown + stay signed in) and expired (reconnect) phases.
 *
 * @example Usage in layout
 * ```typescript
 * import SessionExpiryProvider from '@/components/SessionExpiryProvider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SessionExpiryProvider>
 *           {children}
 *         </SessionExpiryProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export default function SessionExpiryProvider({ children }: { children: React.ReactNode }) {
  const { phase, message, countdown, staySignedIn, reconnect, clearExpiry } = useSessionExpiry();

  return (
    <>
      <SessionExpiryNotification
        phase={phase}
        message={message}
        countdown={countdown}
        onStaySignedIn={staySignedIn}
        onReconnect={reconnect}
        onDismiss={clearExpiry}
      />
      {children}
    </>
  );
}
