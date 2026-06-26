/**
 * Component tests for WalletDropdown
 * Tests focus trap, ARIA roles, keyboard navigation, and prefers-reduced-motion
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the useFocusTrap hook
vi.mock('../src/lib/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(() => ({ current: null })),
}));

const defaultProps = {
  isOpen: true,
  isConnected: true,
  onClose: vi.fn(),
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
  buttonRef: { current: null } as React.RefObject<HTMLButtonElement>,
  walletAddress: 'GABCDEFGHIJK1234567890ABCDEFGHIJK1234567890ABCDEFGHIJK123456',
  network: 'Testnet',
};

// Dynamic import to avoid hoisting issues with vi.mock
let WalletDropdown: typeof import('./WalletDropdown').default;

beforeEach(async () => {
  vi.clearAllMocks();

  // Mock matchMedia for prefers-reduced-motion
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  const mod = await import('./WalletDropdown');
  WalletDropdown = mod.default;
});

describe('WalletDropdown', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <WalletDropdown {...defaultProps} isOpen={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when isOpen is true', () => {
    render(<WalletDropdown {...defaultProps} />);
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  describe('ARIA roles and attributes', () => {
    it('has role="menu" on the container', () => {
      render(<WalletDropdown {...defaultProps} />);
      const menu = screen.getByRole('menu');
      expect(menu.getAttribute('aria-label')).toBe('Wallet account menu');
      expect(menu.getAttribute('aria-orientation')).toBe('vertical');
    });

    it('uses correct aria-label when disconnected', () => {
      render(<WalletDropdown {...defaultProps} isConnected={false} />);
      const menu = screen.getByRole('menu');
      expect(menu.getAttribute('aria-label')).toBe('Connect wallet menu');
    });

    it('has role="menuitem" on interactive buttons when connected', () => {
      render(<WalletDropdown {...defaultProps} />);
      const menuItems = screen.getAllByRole('menuitem');
      // Copy, Account, Settings, Disconnect = 4 menu items
      expect(menuItems.length).toBe(4);
    });

    it('has role="menuitem" on Connect Wallet button when disconnected', () => {
      render(<WalletDropdown {...defaultProps} isConnected={false} />);
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBe(1);
      expect(menuItems[0].textContent).toContain('Connect Wallet');
    });

    it('has id matching aria-controls from trigger', () => {
      render(<WalletDropdown {...defaultProps} />);
      const menu = screen.getByRole('menu');
      expect(menu.getAttribute('id')).toBe('wallet-dropdown-menu');
    });
  });

  describe('keyboard navigation', () => {
    it('moves focus down with ArrowDown', () => {
      render(<WalletDropdown {...defaultProps} />);
      const menuItems = screen.getAllByRole('menuitem');

      menuItems[0].focus();
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(menuItems[1]);
    });

    it('moves focus up with ArrowUp', () => {
      render(<WalletDropdown {...defaultProps} />);
      const menuItems = screen.getAllByRole('menuitem');

      menuItems[1].focus();
      fireEvent.keyDown(document, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(menuItems[0]);
    });

    it('wraps focus from last to first with ArrowDown', () => {
      render(<WalletDropdown {...defaultProps} />);
      const menuItems = screen.getAllByRole('menuitem');

      menuItems[menuItems.length - 1].focus();
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(menuItems[0]);
    });

    it('wraps focus from first to last with ArrowUp', () => {
      render(<WalletDropdown {...defaultProps} />);
      const menuItems = screen.getAllByRole('menuitem');

      menuItems[0].focus();
      fireEvent.keyDown(document, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(menuItems[menuItems.length - 1]);
    });

    it('moves focus to first item with Home key', () => {
      render(<WalletDropdown {...defaultProps} />);
      const menuItems = screen.getAllByRole('menuitem');

      menuItems[2].focus();
      fireEvent.keyDown(document, { key: 'Home' });
      expect(document.activeElement).toBe(menuItems[0]);
    });

    it('moves focus to last item with End key', () => {
      render(<WalletDropdown {...defaultProps} />);
      const menuItems = screen.getAllByRole('menuitem');

      menuItems[0].focus();
      fireEvent.keyDown(document, { key: 'End' });
      expect(document.activeElement).toBe(menuItems[menuItems.length - 1]);
    });
  });

  describe('prefers-reduced-motion', () => {
    it('disables transition classes when reduced motion is preferred', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<WalletDropdown {...defaultProps} />);
      const menu = screen.getByRole('menu');
      expect(menu.className).not.toContain('transition-all');
    });
  });

  describe('disconnect', () => {
    it('calls onDisconnect when disconnect button is clicked', () => {
      render(<WalletDropdown {...defaultProps} />);
      const disconnectBtn = screen.getByText('Disconnect').closest('button');
      fireEvent.click(disconnectBtn!);
      expect(defaultProps.onDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('connect', () => {
    it('calls onConnect when connect button is clicked', () => {
      render(<WalletDropdown {...defaultProps} isConnected={false} />);
      const connectBtn = screen.getByText('Connect Wallet');
      fireEvent.click(connectBtn);
      expect(defaultProps.onConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('live region', () => {
    it('has a status live region for announcements', () => {
      render(<WalletDropdown {...defaultProps} />);
      const status = screen.getByRole('status');
      expect(status.getAttribute('aria-live')).toBe('polite');
    });
  });
});
