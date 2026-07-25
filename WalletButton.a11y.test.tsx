import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletButton } from '@/components/WalletButton';
import { WalletContext } from '@/lib/contexts/WalletContext';
import { axe } from 'jest-axe';

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

const renderWithProvider = (publicKey: string | null) => {
  return render(
    <WalletContext.Provider
      value={{
        publicKey,
        connect: mockConnect,
        disconnect: mockDisconnect,
        isConnecting: false,
      }}
    >
      <WalletButton />
    </WalletContext.Provider>,
  );
};

describe('WalletButton Accessibility', () => {
  it('should have no accessibility violations when disconnected', async () => {
    const { container } = renderWithProvider(null);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when connected', async () => {
    const { container } = renderWithProvider('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have aria-haspopup and aria-expanded attributes when connected', () => {
    renderWithProvider('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');
    const button = screen.getByRole('button', { name: /Wallet options for GABCDE...7890/i });
    expect(button).toHaveAttribute('aria-haspopup', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('provides an accessible name for the connected wallet button', () => {
    renderWithProvider('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName('Wallet options for GABCDE...7890');
  });

  it('dropdown menu items should be accessible', () => {
    renderWithProvider('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('menuitem', { name: 'Copy wallet address' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'View on Explorer' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Disconnect' })).toBeInTheDocument();
  });
});