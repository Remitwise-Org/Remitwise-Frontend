'use client';

/**
 * StaleBanner
 *
 * A dismissible inline banner that warns the user they are viewing cached
 * (potentially outdated) data because the latest fetch failed.
 *
 * ## Design tokens
 * Uses only `status.warning.*` Tailwind tokens defined in `tailwind.config.js`:
 * - `text-[--tw-color-status-warning-fg]` → amber foreground
 * - `bg-[status-warning-bg]`              → amber tinted background
 * - `border-[status-warning-border]`      → amber tinted border
 *
 * ## Accessibility
 * - `role="status"` with `aria-live="polite"` so screen-reader users are
 *   informed without interrupting ongoing announcements.
 * - The dismiss button has an explicit `aria-label`.
 * - The refresh button is clearly labelled.
 *
 * @example
 * ```tsx
 * <StaleBanner
 *   staleAt={staleAt}
 *   onRefresh={load}
 *   onDismiss={() => setDismissed(true)}
 * />
 * ```
 */

import { AlertTriangle, RefreshCw, X } from 'lucide-react';

export interface StaleBannerProps {
  /**
   * Epoch timestamp (ms) of when the cached data was originally fetched.
   * Used to display a relative "last updated X minutes ago" label.
   * Pass `null` to omit the age label.
   */
  staleAt: number | null;
  /** Called when the user presses the Refresh button. */
  onRefresh: () => void;
  /**
   * Called when the user dismisses the banner.
   * If omitted the dismiss button is not rendered.
   */
  onDismiss?: () => void;
  /** Additional Tailwind classes applied to the root element. */
  className?: string;
}

/**
 * Formats a ms epoch timestamp into a human-readable relative age string.
 * Returns an empty string when the age cannot be determined.
 */
function relativeAge(cachedAt: number | null): string {
  if (cachedAt === null) return '';
  const ageMs = Date.now() - cachedAt;
  const ageMinutes = Math.floor(ageMs / 60_000);
  if (ageMinutes < 1) return 'less than a minute ago';
  if (ageMinutes === 1) return '1 minute ago';
  if (ageMinutes < 60) return `${ageMinutes} minutes ago`;
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours === 1) return '1 hour ago';
  return `${ageHours} hours ago`;
}

export function StaleBanner({
  staleAt,
  onRefresh,
  onDismiss,
  className = '',
}: StaleBannerProps) {
  const age = relativeAge(staleAt);

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        // Layout
        'flex items-start gap-3 rounded-xl px-4 py-3',
        // Warning design tokens from tailwind.config.js
        'border',
        'border-[rgba(245,158,11,0.28)]',       // status.warning.border
        'bg-[rgba(245,158,11,0.14)]',            // status.warning.bg
        'text-[#FDE68A]',                        // status.warning.fg
        className,
      ].join(' ')}
    >
      {/* Icon */}
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden="true"
      />

      {/* Message */}
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">Showing cached data.</span>{' '}
        <span className="text-[#FDE68A]/80">
          Live data could not be loaded.
          {age ? ` Last refreshed ${age}.` : ''}
        </span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh data"
          className="flex items-center gap-1.5 rounded-lg border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.14)] px-2.5 py-1 text-xs font-semibold text-[#FDE68A] transition-colors hover:bg-[rgba(245,158,11,0.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDE68A]"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Refresh
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss stale data warning"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#FDE68A]/60 transition-colors hover:bg-[rgba(245,158,11,0.14)] hover:text-[#FDE68A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDE68A]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export default StaleBanner;
