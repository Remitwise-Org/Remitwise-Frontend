import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useInfiniteScrollObserver } from './useInfiniteScrollObserver';

/**
 * Minimal IntersectionObserver mock. Captures the callback passed to the
 * constructor so tests can simulate the sentinel entering the viewport.
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn();
  unobserve = vi.fn();

  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

interface HarnessProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

// Renders a real DOM node for the sentinel ref, so React attaches it during
// commit before the hook's effect runs — matching real usage where the ref
// is passed to JSX rather than assigned by hand.
function Harness({ hasMore, loading, onLoadMore }: HarnessProps) {
  const { sentinelRef, isObserverActive } = useInfiniteScrollObserver({
    hasMore,
    loading,
    onLoadMore,
  });

  return (
    <div>
      <div data-testid="sentinel" ref={sentinelRef} />
      <span data-testid="active">{String(isObserverActive)}</span>
    </div>
  );
}

describe('useInfiniteScrollObserver', () => {
  const originalIO = global.IntersectionObserver;

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    (global as any).IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    global.IntersectionObserver = originalIO;
    vi.restoreAllMocks();
  });

  it('reports the observer as active when supported and motion is not reduced', () => {
    render(<Harness hasMore loading={false} onLoadMore={vi.fn()} />);
    expect(screen.getByTestId('active')).toHaveTextContent('true');
  });

  it('calls onLoadMore when the sentinel intersects', () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore loading={false} onLoadMore={onLoadMore} />);

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    MockIntersectionObserver.instances[0].trigger(true);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call onLoadMore when the sentinel is not intersecting', () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore loading={false} onLoadMore={onLoadMore} />);

    MockIntersectionObserver.instances[0].trigger(false);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not create an observer when hasMore is false', () => {
    render(<Harness hasMore={false} loading={false} onLoadMore={vi.fn()} />);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('does not create an observer while a load is already in flight', () => {
    render(<Harness hasMore loading onLoadMore={vi.fn()} />);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('falls back to manual-only mode when IntersectionObserver is unsupported', () => {
    delete (global as any).IntersectionObserver;

    render(<Harness hasMore loading={false} onLoadMore={vi.fn()} />);

    expect(screen.getByTestId('active')).toHaveTextContent('false');
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('falls back to manual-only mode when the user prefers reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    render(<Harness hasMore loading={false} onLoadMore={vi.fn()} />);

    expect(screen.getByTestId('active')).toHaveTextContent('false');
    // `usePrefersReducedMotion` always starts `false` on the first render
    // (its SSR-safe contract) and flips via its own effect, so a transient
    // observer may be constructed before the preference resolves — but it
    // must not stay connected once it does.
    MockIntersectionObserver.instances.forEach((instance) => {
      expect(instance.disconnect).toHaveBeenCalled();
    });
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Harness hasMore loading={false} onLoadMore={vi.fn()} />);
    const instance = MockIntersectionObserver.instances[0];

    unmount();

    expect(instance.disconnect).toHaveBeenCalledTimes(1);
  });
});
