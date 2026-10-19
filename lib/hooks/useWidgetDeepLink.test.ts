import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { useWidgetDeepLink } from './useWidgetDeepLink';
import { WIDGET_IDS } from '@/lib/config/widgets';

// ── Mock next/navigation ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

function mockSearchParams(widget: string | null) {
  vi.mocked(useSearchParams).mockReturnValue({
    get: (key: string) => (key === 'widget' ? widget : null),
  } as ReturnType<typeof useSearchParams>);
}

// ── Mock scrollIntoView & classList ──────────────────────────────────────────
const scrollIntoViewMock = vi.fn();
const addClassMock        = vi.fn();
const removeClassMock     = vi.fn();
const addEventListenerMock    = vi.fn();
const removeEventListenerMock = vi.fn();

function makeEl() {
  return {
    scrollIntoView:   scrollIntoViewMock,
    classList:        { add: addClassMock, remove: removeClassMock },
    addEventListener:    addEventListenerMock,
    removeEventListener: removeEventListenerMock,
  } as unknown as HTMLDivElement;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useWidgetDeepLink', () => {
  it('returns a ref object', () => {
    mockSearchParams(null);
    const { result } = renderHook(() =>
      useWidgetDeepLink(WIDGET_IDS.SIX_MONTH_TRENDS)
    );
    expect(result.current).toHaveProperty('current');
  });

  it('does nothing when ?widget param is absent', () => {
    mockSearchParams(null);
    const { result } = renderHook(() =>
      useWidgetDeepLink(WIDGET_IDS.SIX_MONTH_TRENDS)
    );
    // Attach a fake element
    (result.current as React.MutableRefObject<HTMLDivElement>).current = makeEl();
    vi.runAllTimers();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('does nothing when ?widget param is an unknown value', () => {
    mockSearchParams('not-a-real-widget');
    const { result } = renderHook(() =>
      useWidgetDeepLink(WIDGET_IDS.SIX_MONTH_TRENDS)
    );
    (result.current as React.MutableRefObject<HTMLDivElement>).current = makeEl();
    vi.runAllTimers();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('does nothing when ?widget param targets a different widget', () => {
    mockSearchParams(WIDGET_IDS.MONEY_DISTRIBUTION);
    const { result } = renderHook(() =>
      useWidgetDeepLink(WIDGET_IDS.SIX_MONTH_TRENDS)
    );
    (result.current as React.MutableRefObject<HTMLDivElement>).current = makeEl();
    vi.runAllTimers();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('scrolls into view and adds highlight class when widget matches', () => {
    mockSearchParams(WIDGET_IDS.SIX_MONTH_TRENDS);
    const { result } = renderHook(() =>
      useWidgetDeepLink(WIDGET_IDS.SIX_MONTH_TRENDS)
    );
    const el = makeEl();
    (result.current as React.MutableRefObject<HTMLDivElement>).current = el;

    vi.runAllTimers();

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(addClassMock).toHaveBeenCalledWith('widget-highlight');
  });

  it('removes highlight class after animationend fires', () => {
    mockSearchParams(WIDGET_IDS.RECENT_TRANSACTIONS);
    const { result } = renderHook(() =>
      useWidgetDeepLink(WIDGET_IDS.RECENT_TRANSACTIONS)
    );
    const el = makeEl();
    (result.current as React.MutableRefObject<HTMLDivElement>).current = el;
    vi.runAllTimers();

    // Simulate the CSS animation ending
    const [, handler] = addEventListenerMock.mock.calls[0] as [string, () => void];
    handler();

    expect(removeClassMock).toHaveBeenCalledWith('widget-highlight');
    expect(removeEventListenerMock).toHaveBeenCalled();
  });

  it('works for every registered widget ID', () => {
    for (const id of Object.values(WIDGET_IDS)) {
      vi.clearAllMocks();
      mockSearchParams(id);
      const { result } = renderHook(() => useWidgetDeepLink(id));
      const el = makeEl();
      (result.current as React.MutableRefObject<HTMLDivElement>).current = el;
      vi.runAllTimers();
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    }
  });
});