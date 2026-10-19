import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NetworkStatusProvider } from '@/lib/context/NetworkStatusContext';
import NetworkStatusIndicator from '@/components/NetworkStatusIndicator';

const mockToast = vi.fn();

vi.mock('@/lib/context/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
}));

function renderIndicator() {
  return render(
    <NetworkStatusProvider>
      <NetworkStatusIndicator />
    </NetworkStatusProvider>
  );
}

describe('NetworkStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an online indicator when browser is online', () => {
    renderIndicator();
    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Online');
  });

  it('renders an offline indicator when browser is offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    renderIndicator();
    expect(screen.getByText('Offline')).toBeTruthy();
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Offline');
  });

  it('fires a toast when transitioning from online to offline', () => {
    renderIndicator();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'error',
      title: 'You are offline',
      description: 'Some features may be unavailable until your connection is restored.',
    });
  });

  it('fires a toast when transitioning from offline to online', () => {
    vi.stubGlobal('navigator', { onLine: false });
    renderIndicator();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'success',
      title: 'Back online',
    });
  });

  it('does not fire a toast on initial mount when online', () => {
    renderIndicator();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('fires only one toast per transition (no duplicate calls)', () => {
    renderIndicator();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(mockToast).toHaveBeenCalledTimes(2);
  });
});
