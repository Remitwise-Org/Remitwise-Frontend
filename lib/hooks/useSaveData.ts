import { useState, useEffect } from 'react';

/**
 * Returns `true` when the browser signals that the user is on a metered /
 * low-bandwidth connection via the `Save-Data: on` client hint (part of the
 * Network Information API).
 *
 * When active, chart components should swap their rich Recharts visualisations
 * for lightweight static alternatives (tables, bar lists, etc.) so that
 * heavy library code, SVG paths, and animation timers are not downloaded or
 * executed unnecessarily.
 *
 * ### Behaviour
 * - **SSR-safe:** defaults to `false` on the server so hydration never
 *   produces a mismatch.
 * - **Reactive:** updates when `navigator.connection.saveData` changes at
 *   runtime (e.g. the user toggles Data Saver in their browser settings).
 * - **Graceful degradation:** returns `false` in environments that do not
 *   implement the Network Information API (Safari, Firefox, Node).
 *
 * ### Usage
 * ```tsx
 * import { useSaveData } from "@/lib/hooks/useSaveData";
 *
 * export default function MyChart({ data }) {
 *   const saveData = useSaveData();
 *
 *   if (saveData) {
 *     return <DataTable data={data} />;
 *   }
 *
 *   return <FancyAnimatedChart data={data} />;
 * }
 * ```
 *
 * ### Testing
 * In Chromium-based browsers: DevTools → Network → "Enable network throttling"
 * and tick "Save-Data". Alternatively, pass the `Save-Data: on` request
 * header, or use `navigator.connection` overrides in unit tests.
 */
export function useSaveData(): boolean {
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // The Network Information API is not universally supported.
    const connection =
      (navigator as Navigator & {
        connection?: { saveData: boolean; addEventListener: (...args: unknown[]) => void; removeEventListener: (...args: unknown[]) => void };
        mozConnection?: { saveData: boolean };
        webkitConnection?: { saveData: boolean };
      }).connection ??
      (navigator as any).mozConnection ??
      (navigator as any).webkitConnection;

    if (!connection) return;

    const update = () => setSaveData(Boolean(connection.saveData));

    // Initialise with the current value.
    update();

    // Listen for changes (e.g. user toggles Data Saver mid-session).
    if (typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', update);
      return () => connection.removeEventListener('change', update);
    }
  }, []);

  return saveData;
}
