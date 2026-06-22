import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  RemittanceTrendChart,
  MOCK_TREND_DATA,
  type TrendDataPoint,
} from '@/components/Insights/remittanceTrendChart';

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

beforeAll(() => {
  // recharts' ResponsiveContainer needs ResizeObserver; jsdom lacks it.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  // useReducedMotion() reads window.matchMedia, which jsdom doesn't implement.
  stubMatchMedia(false);
});

afterEach(cleanup);

describe('RemittanceTrendChart', () => {
  it('mounts with MOCK_TREND_DATA without throwing', () => {
    expect(() => render(<RemittanceTrendChart data={MOCK_TREND_DATA} />)).not.toThrow();
    expect(screen.getByText('Remittance Trend')).toBeInTheDocument();
  });

  it('renders the accessible sr-only summary for every point', () => {
    const { container } = render(<RemittanceTrendChart data={MOCK_TREND_DATA} />);
    const summary = container.querySelector('.sr-only');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain('Sep 1: $520');
    expect(summary?.textContent).toContain('(2 transactions)');
    // Last point also present, proving the whole series is summarized.
    expect(summary?.textContent).toContain('Dec 8: $1,420');
  });

  it('renders the peak stat derived from the data', () => {
    render(<RemittanceTrendChart data={MOCK_TREND_DATA} />);
    // Peak of MOCK_TREND_DATA is 1650.
    expect(screen.getByText('$1,650')).toBeInTheDocument();
  });

  it('uses the default MOCK_TREND_DATA when no data prop is passed', () => {
    expect(() => render(<RemittanceTrendChart />)).not.toThrow();
    expect(screen.getByText('$1,650')).toBeInTheDocument();
  });

  it('shows an empty state (never NaN/-Infinity) for an empty data array', () => {
    const { container } = render(<RemittanceTrendChart data={[]} />);
    expect(screen.getByText(/no remittance data yet/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
    // Accessible summary still present in the empty state.
    expect(container.querySelector('.sr-only')?.textContent).toMatch(/no remittance trend data/i);
  });

  it('renders with a single data point without throwing', () => {
    const single: TrendDataPoint[] = [{ date: 'Jan 1', amount: 1000, transactions: 2 }];
    expect(() => render(<RemittanceTrendChart data={single} />)).not.toThrow();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('disables animation for reduced-motion users without crashing', () => {
    stubMatchMedia(true);
    expect(() => render(<RemittanceTrendChart data={MOCK_TREND_DATA} />)).not.toThrow();
    stubMatchMedia(false);
  });
});
