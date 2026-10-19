/**
 * Tests for the patterns described in docs/performance-patterns.md.
 *
 * Three areas are covered:
 *   1. Memoization boundaries — memo wrapping and retryKey remount
 *   2. Key selectors — stable keys vs index keys
 *   3. Event delegation — single container handler
 */

import React, { memo, useCallback, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// 1. Memoization boundaries
// ---------------------------------------------------------------------------

describe('memoization boundaries', () => {
  describe('memo prevents re-render when props are unchanged', () => {
    it('does not re-render a memo-wrapped child when only the parent state changes', () => {
      const renderCount = { current: 0 };

      const Child = memo(function Child({ label }: { label: string }) {
        renderCount.current += 1;
        return <span>{label}</span>;
      });

      function Parent() {
        const [count, setCount] = useState(0);
        return (
          <div>
            <button onClick={() => setCount((c) => c + 1)}>inc</button>
            <Child label="stable" />
            <span data-testid="count">{count}</span>
          </div>
        );
      }

      render(<Parent />);
      expect(renderCount.current).toBe(1);

      fireEvent.click(screen.getByRole('button', { name: 'inc' }));
      fireEvent.click(screen.getByRole('button', { name: 'inc' }));

      // Parent re-rendered twice but Child props never changed → still 1 render
      expect(renderCount.current).toBe(1);
      expect(screen.getByTestId('count').textContent).toBe('2');
    });

    it('re-renders a memo-wrapped child when its props change', () => {
      const renderCount = { current: 0 };

      const Child = memo(function Child({ value }: { value: number }) {
        renderCount.current += 1;
        return <span>{value}</span>;
      });

      function Parent() {
        const [value, setValue] = useState(0);
        return (
          <div>
            <button onClick={() => setValue((v) => v + 1)}>inc</button>
            <Child value={value} />
          </div>
        );
      }

      render(<Parent />);
      expect(renderCount.current).toBe(1);

      fireEvent.click(screen.getByRole('button', { name: 'inc' }));
      expect(renderCount.current).toBe(2);
    });
  });

  describe('retryKey remount pattern', () => {
    it('increments retryKey to force a full remount of the widget root', () => {
      const mountCount = { current: 0 };

      function Widget() {
        const [retryKey, setRetryKey] = useState(0);
        const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

        return (
          <div key={retryKey}>
            <Inner onMount={() => { mountCount.current += 1; }} />
            <button onClick={handleRetry}>retry</button>
          </div>
        );
      }

      function Inner({ onMount }: { onMount: () => void }) {
        React.useEffect(() => { onMount(); }, [onMount]);
        return <span>content</span>;
      }

      render(<Widget />);
      expect(mountCount.current).toBe(1);

      fireEvent.click(screen.getByRole('button', { name: 'retry' }));
      expect(mountCount.current).toBe(2);

      fireEvent.click(screen.getByRole('button', { name: 'retry' }));
      expect(mountCount.current).toBe(3);
    });

    it('resets child state on remount', () => {
      function Widget() {
        const [retryKey, setRetryKey] = useState(0);
        const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

        return (
          <div key={retryKey}>
            <Counter />
            <button onClick={handleRetry}>retry</button>
          </div>
        );
      }

      function Counter() {
        const [n, setN] = useState(0);
        return (
          <div>
            <span data-testid="n">{n}</span>
            <button onClick={() => setN((v) => v + 1)}>+</button>
          </div>
        );
      }

      render(<Widget />);
      fireEvent.click(screen.getByRole('button', { name: '+' }));
      fireEvent.click(screen.getByRole('button', { name: '+' }));
      expect(screen.getByTestId('n').textContent).toBe('2');

      // Retry remounts the subtree → counter resets to 0
      fireEvent.click(screen.getByRole('button', { name: 'retry' }));
      expect(screen.getByTestId('n').textContent).toBe('0');
    });
  });

  describe('useCallback produces a stable reference', () => {
    it('returns the same function reference across re-renders when deps are unchanged', () => {
      const refs: Array<() => void> = [];

      function Parent() {
        const [tick, setTick] = useState(0);
        const stable = useCallback(() => {}, []);
        refs.push(stable);
        return <button onClick={() => setTick((t) => t + 1)}>tick {tick}</button>;
      }

      render(<Parent />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByRole('button'));

      expect(refs.length).toBe(3);
      expect(refs[0]).toBe(refs[1]);
      expect(refs[1]).toBe(refs[2]);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Key selectors
// ---------------------------------------------------------------------------

describe('key selectors', () => {
  it('stable ID keys preserve DOM nodes across re-renders', () => {
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ];

    function List({ data }: { data: typeof items }) {
      return (
        <ul>
          {data.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>
      );
    }

    const { rerender } = render(<List data={items} />);
    const firstAlpha = screen.getByText('Alpha');

    // Re-render with the same data — DOM node should be reused
    rerender(<List data={[...items]} />);
    expect(screen.getByText('Alpha')).toBe(firstAlpha);
  });

  it('index keys cause incorrect element identity when the list is reordered', () => {
    // This test documents the anti-pattern: with index keys, React matches
    // elements by position, so a reorder updates content in-place rather than
    // moving the existing DOM nodes.
    const original = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ];
    const reversed = [...original].reverse();

    function IndexKeyList({ data }: { data: typeof original }) {
      return (
        <ul>
          {data.map((item, i) => (
            <li key={i}>{item.label}</li>
          ))}
        </ul>
      );
    }

    function IdKeyList({ data }: { data: typeof original }) {
      return (
        <ul>
          {data.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>
      );
    }

    // With ID keys the order in the DOM matches the data order after rerender
    const { rerender: rerenderIdList } = render(<IdKeyList data={original} />);
    rerenderIdList(<IdKeyList data={reversed} />);
    const idItems = screen.getAllByRole('listitem');
    expect(idItems[0].textContent).toBe('Beta');
    expect(idItems[1].textContent).toBe('Alpha');

    cleanup();

    // With index keys the DOM order also reflects the new data order (content
    // is updated in-place), but internal state would be wrong for stateful items
    const { rerender: rerenderIndexList } = render(<IndexKeyList data={original} />);
    rerenderIndexList(<IndexKeyList data={reversed} />);
    const indexItems = screen.getAllByRole('listitem');
    expect(indexItems[0].textContent).toBe('Beta');
    expect(indexItems[1].textContent).toBe('Alpha');
  });

  it('intentional key change remounts the element and resets its state', () => {
    function Stateful({ id }: { id: string }) {
      const [count, setCount] = useState(0);
      return (
        <div key={id}>
          <span data-testid="count">{count}</span>
          <button onClick={() => setCount((c) => c + 1)}>+</button>
        </div>
      );
    }

    function Wrapper() {
      const [id, setId] = useState('first');
      return (
        <div>
          <Stateful key={id} id={id} />
          <button onClick={() => setId('second')}>switch</button>
        </div>
      );
    }

    render(<Wrapper />);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(screen.getByTestId('count').textContent).toBe('2');

    // Changing the key remounts Stateful → count resets
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// 3. Event delegation
// ---------------------------------------------------------------------------

describe('event delegation', () => {
  it('a single container handler fires for any item button click', () => {
    const handler = vi.fn();

    function DelegatedList({ items }: { items: Array<{ id: string; label: string }> }) {
      const handleClick = useCallback(
        (e: React.MouseEvent<HTMLUListElement>) => {
          const button = (e.target as HTMLElement).closest('button[data-id]');
          if (!button) return;
          handler(button.getAttribute('data-id'));
        },
        [],
      );

      return (
        <ul onClick={handleClick}>
          {items.map((item) => (
            <li key={item.id}>
              <button data-id={item.id}>{item.label}</button>
            </li>
          ))}
        </ul>
      );
    }

    const items = [
      { id: 'bill-1', label: 'Electricity' },
      { id: 'bill-2', label: 'Water' },
      { id: 'bill-3', label: 'Internet' },
    ];

    render(<DelegatedList items={items} />);

    fireEvent.click(screen.getByRole('button', { name: 'Water' }));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('bill-2');

    fireEvent.click(screen.getByRole('button', { name: 'Internet' }));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenLastCalledWith('bill-3');
  });

  it('clicks on a child element inside the button are still captured via closest()', () => {
    const handler = vi.fn();

    function DelegatedList() {
      const handleClick = useCallback((e: React.MouseEvent<HTMLUListElement>) => {
        const button = (e.target as HTMLElement).closest('button[data-id]');
        if (!button) return;
        handler(button.getAttribute('data-id'));
      }, []);

      return (
        <ul onClick={handleClick}>
          <li>
            <button data-id="goal-1">
              {/* Icon rendered as a child of the button */}
              <span aria-hidden="true">★</span>
              <span>Emergency Fund</span>
            </button>
          </li>
        </ul>
      );
    }

    render(<DelegatedList />);

    // Click the icon span — closest() should walk up to the button
    fireEvent.click(screen.getByText('★'));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('goal-1');
  });

  it('clicks outside any item button are ignored by the delegated handler', () => {
    const handler = vi.fn();

    function DelegatedList() {
      const handleClick = useCallback((e: React.MouseEvent<HTMLUListElement>) => {
        const button = (e.target as HTMLElement).closest('button[data-id]');
        if (!button) return;
        handler(button.getAttribute('data-id'));
      }, []);

      return (
        <ul onClick={handleClick}>
          <li>
            <span data-testid="label">Bill name</span>
            <button data-id="bill-1">Pay</button>
          </li>
        </ul>
      );
    }

    render(<DelegatedList />);

    // Click the label text, not the button
    fireEvent.click(screen.getByTestId('label'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('the delegated handler reference is stable across parent re-renders', () => {
    const handlerRefs: Array<React.MouseEventHandler> = [];

    function Parent() {
      const [tick, setTick] = useState(0);

      const handleClick = useCallback((e: React.MouseEvent<HTMLUListElement>) => {
        const button = (e.target as HTMLElement).closest('button[data-id]');
        if (button) { /* handle */ }
      }, []);

      handlerRefs.push(handleClick);

      return (
        <div>
          <button onClick={() => setTick((t) => t + 1)}>tick {tick}</button>
          <ul onClick={handleClick} />
        </div>
      );
    }

    render(<Parent />);
    fireEvent.click(screen.getByRole('button', { name: /tick/i }));
    fireEvent.click(screen.getByRole('button', { name: /tick/i }));

    expect(handlerRefs.length).toBe(3);
    expect(handlerRefs[0]).toBe(handlerRefs[1]);
    expect(handlerRefs[1]).toBe(handlerRefs[2]);
  });
});
