import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletButton from '../../../components/WalletButton';

// Mock lucide-react to avoid SVG parsing issues
vi.mock('lucide-react', () => ({
  Wallet: () => <div data-testid="icon-wallet" />,
  ChevronDown: () => <div data-testid="icon-chevron" />,
  Copy: () => <div data-testid="icon-copy" />,
  Check: () => <div data-testid="icon-check" />,
  User: () => <div data-testid="icon-user" />,
  Settings: () => <div data-testid="icon-settings" />,
  LogOut: () => <div data-testid="icon-logout" />,
  Loader2: () => <div data-testid="icon-loader" />,
  ExternalLink: () => <div data-testid="icon-external" />,
}));

// Mock logout
vi.mock('@/lib/client/logout', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}));

// Mock useToast
vi.mock('@/lib/context/ToastContext', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

let mockConnected = false;
let mockAddress = 'GDEMOXQ3D5AFX4K7IQ3XR5ZYQ2H7F4QO2N7F4R6STJHK2QMZ7CNC3';
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('stellar-wallet-kit', () => ({
  useWallet: () => ({
    account: mockConnected ? { address: mockAddress } : null,
    isConnected: mockConnected,
    connect: mockConnect,
    disconnect: mockDisconnect,
    network: 'Testnet',
  }),
}));

describe('WalletButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnected = false;
    mockConnect.mockImplementation(() => {
      mockConnected = true;
      return Promise.resolve();
    });
    mockDisconnect.mockImplementation(() => {
      mockConnected = false;
      return Promise.resolve();
    });
  });

  it('shows loading state and prevents double clicks while connecting', async () => {
    const user = userEvent.setup();
    let resolveConnect: () => void;
    
    mockConnect.mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolveConnect = resolve;
      });
    });

    render(<WalletButton />);

    // Open dropdown
    const triggerButton = screen.getByRole('button', { name: /Connect Wallet/i });
    await user.click(triggerButton);

    // Find the connect button inside the dropdown
    const connectBtn = screen.getByRole('menuitem', { name: /Connect Wallet/i });

    expect(connectBtn).not.toBeDisabled();

    // Click connect
    await user.click(connectBtn);

    // Should disable the button and show loading text
    expect(connectBtn).toBeDisabled();
    expect(connectBtn).toHaveTextContent(/Connecting\.\.\./i);
    expect(mockConnect).toHaveBeenCalledTimes(1);

    // Try clicking again while loading
    await user.click(connectBtn);
    expect(mockConnect).toHaveBeenCalledTimes(1); // Should not have been called again

    // Resolve connection
    resolveConnect!();

    // Wait for dropdown to close or state to reset
    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  it('should return focus to the trigger button when connect succeeds', async () => {
    const user = userEvent.setup();
    render(<WalletButton />);

    const triggerButton = screen.getByRole('button', { name: /Connect Wallet/i });
    await user.click(triggerButton);

    const connectBtn = screen.getByRole('menuitem', { name: /Connect Wallet/i });
    await user.click(connectBtn);

    await waitFor(() => {
      // Trigger button should receive focus again
      expect(document.activeElement).toBe(triggerButton);
    });
  });

  it('should return focus to the trigger button when disconnect succeeds', async () => {
    const user = userEvent.setup();
    mockConnected = true; // start connected
    render(<WalletButton />);

    // Trigger button shows truncated address when connected
    const triggerButton = screen.getByRole('button', { name: /GDEMOX\.\.\.CNC3/i });
    await user.click(triggerButton);

    const disconnectBtn = screen.getByRole('menuitem', { name: /Disconnect/i });
    await user.click(disconnectBtn);

    await waitFor(() => {
      expect(document.activeElement).toBe(triggerButton);
    });
  });

  it('should return focus to the trigger button when escape key closes dropdown', async () => {
    const user = userEvent.setup();
    render(<WalletButton />);

    const triggerButton = screen.getByRole('button', { name: /Connect Wallet/i });
    await user.click(triggerButton);

    // Active element is now the connect button inside dropdown
    const connectBtn = screen.getByRole('menuitem', { name: /Connect Wallet/i });
    await waitFor(() => {
      expect(document.activeElement).toBe(connectBtn);
    });

    // Press Escape
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(document.activeElement).toBe(triggerButton);
    });
  });
});
