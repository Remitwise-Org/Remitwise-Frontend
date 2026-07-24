import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletButton from '../../../components/WalletButton';

// Mock lucide-react to avoid SVG parsing issues
vi.mock('lucide-react', () => ({
  Wallet: () => <div data-testid="icon-wallet" />,
  ChevronDown: () => <div data-testid="icon-chevron" />,
  Copy: () => <div data-testid="icon-copy" />,
  User: () => <div data-testid="icon-user" />,
  Settings: () => <div data-testid="icon-settings" />,
  LogOut: () => <div data-testid="icon-logout" />,
}));

// Mock logout
vi.mock('@/lib/client/logout', () => ({
  logout: vi.fn(),
}));

let mockConnect = vi.fn();

vi.mock('stellar-wallet-kit', () => ({
  useWallet: () => ({
    account: null,
    isConnected: false,
    connect: mockConnect,
    disconnect: vi.fn(),
    network: 'testnet',
  }),
}));

describe('WalletButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect = vi.fn().mockResolvedValue(undefined);
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
});
