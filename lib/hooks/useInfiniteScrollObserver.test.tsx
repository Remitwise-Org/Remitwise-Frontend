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

  it('disconnects_observer_when_hasMore_changes_to_false', () => {
    const { rerender } = render(
      <Harness hasMore loading={false} onLoadMore={vi.fn()} />,
    );

    // After the initial render cycle the *last* entry in instances is
    // the currently active observer. (usePrefersReducedMotion may have
    // triggered one cleanup cycle before it resolves, so we always
    // assert against the most recent instance.)
    const activeIdx = MockIntersectionObserver.instances.length - 1;
    const activeBefore = MockIntersectionObserver.instances[activeIdx];
    expect(activeBefore).toBeDefined();

    // Flip hasMore to false — the effect cleanup should disconnect the
    // currently active observer.
    rerender(<Harness hasMore={false} loading={false} onLoadMore={vi.fn()} />);

    // The observer that was active before the dependency change must now
    // be disconnected. We assert it *was* called at least once rather
    // than pin an exact count because usePrefersReducedMotion may have
    // already triggered a cleanup cycle during mount.
    expect(activeBefore.disconnect).toHaveBeenCalled();
  });

  it('disconnects_observer_when_loading_changes_to_true', () => {
    const { rerender } = render(
      <Harness hasMore loading={false} onLoadMore={vi.fn()} />,
    );

    const activeIdx = MockIntersectionObserver.instances.length - 1;
    const activeBefore = MockIntersectionObserver.instances[activeIdx];
    expect(activeBefore).toBeDefined();

    // Flip loading to true — effect cleanup should disconnect the observer.
    rerender(<Harness hasMore loading onLoadMore={vi.fn()} />);

    expect(activeBefore.disconnect).toHaveBeenCalled();
  });

  it('disconnects_old_observer_when_onLoadMore_reference_changes', () => {
    const firstCallback = vi.fn();
    const { rerender } = render(
      <Harness hasMore loading={false} onLoadMore={firstCallback} />,
    );

    // Take the last (currently active) observer.
    const activeIdx = MockIntersectionObserver.instances.length - 1;
    const oldObserver = MockIntersectionObserver.instances[activeIdx];
    expect(oldObserver).toBeDefined();

    // Passing a new onLoadMore reference triggers the effect to re-run.
    rerender(<Harness hasMore loading={false} onLoadMore={vi.fn()} />);

    // The observer that was active before the reference change should
    // now be disconnected.
    expect(oldObserver.disconnect).toHaveBeenCalled();
  });

  it('does_not_leak_observers_across_multiple_rerenders', () => {
    const { rerender } = render(
      <Harness hasMore loading={false} onLoadMore={vi.fn()} />,
    );

    // Simulate several re-renders — each passes a fresh onLoadMore so the
    // effect re-runs and creates a new observer.
    for (let i = 0; i < 5; i++) {
      rerender(<Harness hasMore loading={false} onLoadMore={vi.fn()} />);
    }

    const instances = MockIntersectionObserver.instances;

    // Every observer from a previous render cycle must have been
    // disconnected. Only the very last one may still be active.
    for (let i = 0; i < instances.length; i++) {
      if (i < instances.length - 1) {
        expect(instances[i].disconnect).toHaveBeenCalled();
      }
    }

  });

  it('disconnects_all_observers_on_final_unmount_after_multiple_rerenders', () => {
    const { rerender, unmount } = render(
      <Harness hasMore loading={false} onLoadMore={vi.fn()} />,
    );

    // Simulate several re-renders.
    for (let i = 0; i < 3; i++) {
      rerender(<Harness hasMore loading={false} onLoadMore={vi.fn()} />);
    }

    // Snapshot all instances before unmount.
    const instances = [...MockIntersectionObserver.instances];

    unmount();

    // Every single instance — including those from stale effect cycles —
    // must be disconnected after the component unmounts.
    for (const inst of instances) {
      expect(inst.disconnect).toHaveBeenCalled();
    }
  });

  it('handles_multiple_independent_hook_instances', () => {
    function MultiHarness() {
      const { sentinelRef: ref1 } = useInfiniteScrollObserver({
        hasMore: true,
        loading: false,
        onLoadMore: vi.fn(),
      });
      const { sentinelRef: ref2 } = useInfiniteScrollObserver({
        hasMore: true,
        loading: false,
        onLoadMore: vi.fn(),
      });
      return (
        <div>
          <div data-testid="sentinel-a" ref={ref1} />
          <div data-testid="sentinel-b" ref={ref2} />
        </div>
      );
    }

    const { unmount } = render(<MultiHarness />);
    expect(MockIntersectionObserver.instances).toHaveLength(2);

    const instA = MockIntersectionObserver.instances[0];
    const instB = MockIntersectionObserver.instances[1];

    unmount();

    // Both instances must be disconnected after unmount — no leaks.
    expect(instA.disconnect).toHaveBeenCalled();
    expect(instB.disconnect).toHaveBeenCalled();
  });
});
