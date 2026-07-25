import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import DevWidgetPayload from './DevWidgetPayload';
import {
  DEV_MODE_STORAGE_KEY,
  DEV_MODE_WIDGET_PAYLOAD_KEY,
  DEV_WIDGET_PAYLOAD_EVENT,
} from '../lib/config/developer';
import type { DashboardResponse } from '../lib/types/dashboard';

// ─── Minimal fixture that satisfies DashboardResponse ────────────────────────

const MOCK_PAYLOAD: DashboardResponse = {
  remittance: {
    status: 'ok',
    totalSent: 1200,
    split: { PHP: 60, INR: 40 },
    recentTransactions: [],
  },
  savings: {
    status: 'ok',
    savingsTotal: 800,
    recentGoals: [],
  },
  bills: {
    status: 'ok',
    billsPaidCount: 3,
    billsPaidAmount: 180,
    unpaidBills: [],
  },
  insurance: {
    status: 'ok',
    insurancePoliciesCount: 1,
    insurancePremium: 30,
    activePolicies: [],
  },
  meta: {
    cachedAt: '2026-01-01T00:00:00.000Z',
    ttlSeconds: 30,
    fromCache: false,
  },
};

// ─── Mock next/navigation ─────────────────────────────────────────────────────

const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dispatchPayload(payload: DashboardResponse) {
  window.dispatchEvent(
    new CustomEvent(DEV_WIDGET_PAYLOAD_EVENT, { detail: payload })
  );
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('DevWidgetPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockGet.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  // ── Visibility ──────────────────────────────────────────────────────────────

  it('renders the panel when ?dev=1 is present', () => {
    mockGet.mockReturnValue('1');
    render(<DevWidgetPayload />);

    expect(document.getElementById('dev-widget-payload-container')).not.toBeNull();
    expect(screen.getByText('Widget Payloads')).toBeDefined();
  });

  it('does not render when ?dev param is absent', () => {
    mockGet.mockReturnValue(null);
    render(<DevWidgetPayload />);

    expect(document.getElementById('dev-widget-payload-container')).toBeNull();
  });

  it('does not render when ?dev=0 is explicitly set', () => {
    mockGet.mockReturnValue('0');
    render(<DevWidgetPayload />);

    expect(document.getElementById('dev-widget-payload-container')).toBeNull();
  });

  it('hides the panel and updates storage when dev=0 overrides a previously active session', () => {
    sessionStorage.setItem(DEV_MODE_STORAGE_KEY, 'true');
    mockGet.mockReturnValue('0');
    render(<DevWidgetPayload />);

    expect(document.getElementById('dev-widget-payload-container')).toBeNull();
    expect(sessionStorage.getItem(DEV_MODE_STORAGE_KEY)).toBe('false');
  });

  it('shows the panel when sessionStorage enables dev mode and no URL param is present', () => {
    sessionStorage.setItem(DEV_MODE_STORAGE_KEY, 'true');
    mockGet.mockReturnValue(null);
    render(<DevWidgetPayload />);

    expect(document.getElementById('dev-widget-payload-container')).not.toBeNull();
  });

  // ── Waiting state ────────────────────────────────────────────────────────────

  it('shows waiting message before any payload arrives', () => {
    mockGet.mockReturnValue('1');
    render(<DevWidgetPayload />);

    expect(screen.getByText('Waiting for dashboard fetch…')).toBeDefined();
  });

  // ── Payload event ────────────────────────────────────────────────────────────

  it('renders section buttons after the custom event is dispatched', () => {
    mockGet.mockReturnValue('1');
    render(<DevWidgetPayload />);

    act(() => {
      dispatchPayload(MOCK_PAYLOAD);
    });

    // All five section buttons should be present
    expect(screen.getByText('remittance')).toBeDefined();
    expect(screen.getByText('savings')).toBeDefined();
    expect(screen.getByText('bills')).toBeDefined();
    expect(screen.getByText('insurance')).toBeDefined();
    expect(screen.getByText('meta')).toBeDefined();
  });

  it('persists the payload to sessionStorage when the event fires', () => {
    mockGet.mockReturnValue('1');
    render(<DevWidgetPayload />);

    act(() => {
      dispatchPayload(MOCK_PAYLOAD);
    });

    const stored = sessionStorage.getItem(DEV_MODE_WIDGET_PAYLOAD_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual(MOCK_PAYLOAD);
  });

  it('does not update payload or sessionStorage when dev mode is off', () => {
    mockGet.mockReturnValue(null);
    render(<DevWidgetPayload />);

    act(() => {
      dispatchPayload(MOCK_PAYLOAD);
    });

    expect(sessionStorage.getItem(DEV_MODE_WIDGET_PAYLOAD_KEY)).toBeNull();
  });

  // ── Section accordion ────────────────────────────────────────────────────────

  it('expands a section and shows JSON when its button is clicked', () => {
    mockGet.mockReturnValue('1');
    render(<DevWidgetPayload />);

    act(() => {
      dispatchPayload(MOCK_PAYLOAD);
    });

    const remittanceBtn = screen.getByText('remittance').closest('button')!;

    // Initially collapsed — no pre element for this section
    expect(screen.queryByLabelText('remittance payload')).toBeNull();

    fireEvent.click(remittanceBtn);

    const pre = screen.getByLabelText('remittance payload');
    expect(pre).toBeDefined();
    expect(pre.textContent).toContain('"totalSent": 1200');
  });

  it('collapses an expanded section on second click', () => {
    mockGet.mockReturnValue('1');
    render(<DevWidgetPayload />);

    act(() => {
      dispatchPayload(MOCK_PAYLOAD);
    });

    const metaBtn = screen.getByText('meta').closest('button')!;

    fireEvent.click(metaBtn); // open
    expect(screen.getByLabelText('meta payload')).toBeDefined();

    fireEvent.click(metaBtn); // close
    expect(screen.queryByLabelText('meta payload')).toBeNull();
  });

  it('aria-expanded reflects section open/closed state', () => {
    mockGet.mockReturnValue('1');
    render(<DevWidgetPayload />);

    act(() => {
      dispatchPayload(MOCK_PAYLOAD);
    });

    const savingsBtn = screen.getByText('savings').closest('button')!;
    expect(savingsBtn.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(savingsBtn);
    expect(savingsBtn.getAttribute('aria-expanded')).toBe('true');
  });

  // ── sessionStorage restoration ────────────────────────────────────────────────

  it('restores a previously persisted payload from sessionStorage on mount', () => {
    sessionStorage.setItem(DEV_MODE_STORAGE_KEY, 'true');
    sessionStorage.setItem(
      DEV_MODE_WIDGET_PAYLOAD_KEY,
      JSON.stringify(MOCK_PAYLOAD)
    );
    mockGet.mockReturnValue(null); // no URL param — relies on stored flag

    render(<DevWidgetPayload />);

    // Section buttons should appear without needing a new event
    expect(screen.getByText('remittance')).toBeDefined();
    expect(screen.getByText('meta')).toBeDefined();
  });

  it('renders gracefully when stored payload is corrupt JSON', () => {
    sessionStorage.setItem(DEV_MODE_STORAGE_KEY, 'true');
    sessionStorage.setItem(DEV_MODE_WIDGET_PAYLOAD_KEY, '{not valid json');
    mockGet.mockReturnValue(null);

    // Should not throw
    render(<DevWidgetPayload />);

    // Falls back to the waiting state rather than crashing
    expect(screen.getByText('Waiting for dashboard fetch…')).toBeDefined();
  });
});
