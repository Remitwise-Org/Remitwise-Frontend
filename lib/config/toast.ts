/**
 * Configuration for the toast notification system.
 */
export function getToastTimeoutMs(): number {
  if (typeof process === "undefined" || !process.env) {
    return 5000;
  }
  
  const envTimeout = process.env.NEXT_PUBLIC_TOAST_TIMEOUT;
  if (!envTimeout) {
    return 5000;
  }

  const parsed = parseInt(envTimeout, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 5000;
  }
  
  return parsed;
}

export const TOAST_TIMEOUT_MS = getToastTimeoutMs();
