import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DevRequestIdDisplay from './DevRequestIdDisplay';
import {
  DEV_MODE_STORAGE_KEY,
  DEV_MODE_LATEST_REQUEST_ID_KEY,
} from '../lib/config/developer';

const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

describe('DevRequestIdDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockGet.mockReset();
    // Reset clipboard mock if modified
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('should render the panel when ?dev=1 is present', () => {
    mockGet.mockReturnValue('1');
    render(<DevRequestIdDisplay />);

    const container = document.getElementById('dev-request-id-container');
    expect(container).not.toBeNull();
    expect(screen.getByText('Developer Mode')).toBeDefined();
    expect(screen.getByText('None')).toBeDefined();
  });

  it('should not render when ?dev=1 is absent', () => {
    mockGet.mockReturnValue(null);
    render(<DevRequestIdDisplay />);

    const container = document.getElementById('dev-request-id-container');
    expect(container).toBeNull();
  });

  it('should update the displayed request ID when dev-request-id-updated event is dispatched', () => {
    mockGet.mockReturnValue('1');
    render(<DevRequestIdDisplay />);

    // Dispatch the custom event inside act
    act(() => {
      const event = new CustomEvent('dev-request-id-updated', {
        detail: 'test-req-123456',
      });
      window.dispatchEvent(event);
    });

    const valEl = document.getElementById('dev-request-id-value');
    expect(valEl?.textContent).toBe('test-req-123456');
    expect(sessionStorage.getItem(DEV_MODE_LATEST_REQUEST_ID_KEY)).toBe('test-req-123456');
  });

  it('should copy the request ID to clipboard when copy button is clicked', async () => {
    mockGet.mockReturnValue('1');
    render(<DevRequestIdDisplay />);

    // Dispatch event to set a real ID inside act
    act(() => {
      const event = new CustomEvent('dev-request-id-updated', {
        detail: 'req-copy-999',
      });
      window.dispatchEvent(event);
    });

    const copyBtn = screen.getByLabelText('Copy request ID');
    expect(copyBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('req-copy-999');
  });

  it('should hide the panel if previously enabled but now dev=0 is requested', () => {
    // Set active in storage first
    sessionStorage.setItem(DEV_MODE_STORAGE_KEY, 'true');
    // URL explicitly turns it off
    mockGet.mockReturnValue('0');

    render(<DevRequestIdDisplay />);

    const container = document.getElementById('dev-request-id-container');
    expect(container).toBeNull();
    expect(sessionStorage.getItem(DEV_MODE_STORAGE_KEY)).toBe('false');
  });
});
