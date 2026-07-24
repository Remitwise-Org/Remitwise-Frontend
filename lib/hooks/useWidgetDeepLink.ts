'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { VALID_WIDGET_IDS, type WidgetId } from '@/lib/config/widgets';

/**
 * Reads the `?widget=<id>` query parameter and, when the value matches a known
 * widget ID, scrolls that widget into view and briefly highlights it so the
 * user knows exactly which panel the support link was pointing to.
 *
 * @param widgetId  - The {@link WidgetId} this component corresponds to.
 * @returns         - A `ref` to attach to the widget's root element.
 *
 * @example
 * ```tsx
 * import { useWidgetDeepLink } from '@/lib/hooks/useWidgetDeepLink';
 * import { WIDGET_IDS } from '@/lib/config/widgets';
 *
 * export default function SixMonthTrendsWidget() {
 *   const ref = useWidgetDeepLink(WIDGET_IDS.SIX_MONTH_TRENDS);
 *   return <div ref={ref}>…</div>;
 * }
 * ```
 */
export function useWidgetDeepLink(widgetId: WidgetId) {
  const searchParams = useSearchParams();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requested = searchParams.get('widget');

    // Bail out early if the param is absent, invalid, or not for this widget.
    if (!requested || !VALID_WIDGET_IDS.has(requested) || requested !== widgetId) {
      return;
    }

    const el = ref.current;
    if (!el) return;

    // Small rAF delay so the page has finished its first paint before we scroll.
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Add the highlight class; CSS handles the animation + auto-removal via
      // an animation that runs once and leaves no residual style.
      el.classList.add('widget-highlight');
      const onEnd = () => {
        el.classList.remove('widget-highlight');
        el.removeEventListener('animationend', onEnd);
      };
      el.addEventListener('animationend', onEnd);
    });

    return () => cancelAnimationFrame(id);
  }, [searchParams, widgetId]);

  return ref;
}