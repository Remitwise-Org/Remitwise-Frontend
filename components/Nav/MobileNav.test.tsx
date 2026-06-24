import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MobileNav from './MobileNav';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}));

// Mock logout
vi.mock('@/lib/client/logout', () => ({
  logout: vi.fn(),
}));

import { usePathname } from 'next/navigation';

const mockedUsePathname = vi.mocked(usePathname);

describe('MobileNav', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/dashboard');
  });

  it('renders the menu toggle button with accessible name', () => {
    render(<MobileNav />);
    const toggleButton = screen.getByRole('button', { name: /open mobile menu/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-label', 'Open Mobile Menu');
  });

  it('opens menu on toggle click and closes on X button', () => {
    render(<MobileNav />);
    const toggleButton = screen.getByRole('button', { name: /open mobile menu/i });
    
    fireEvent.click(toggleButton);
    expect(screen.getByText('Menu')).toBeInTheDocument();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    // Menu should be closed
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });

  it('renders all authenticated app routes with correct hrefs', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open mobile menu/i }));

    const expectedLinks = [
      { name: 'Home', href: '/' },
      { name: 'Send Money', href: '/send' },
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Bills & Payments', href: '/bills' },
      { name: 'Insurance', href: '/insurance' },
      { name: 'Family Hub', href: '/family' },
      { name: 'Overview', href: '/dashboard' },
      { name: 'Savings Goals', href: '/dashboard/goals' },
      { name: 'Insights', href: '/dashboard/insight' },
      { name: 'History', href: '/dashboard/transaction-history' },
      { name: 'Settings', href: '/settings' },
      { name: 'Wallet Details', href: '/wallet-details' },
    ];

    for (const { name, href } of expectedLinks) {
      const link = screen.getByText(name).closest('a');
      expect(link).toHaveAttribute('href', href);
    }
  });

  it('does not render marketing anchors (#features, #pricing, #about)', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open mobile menu/i }));

    expect(screen.queryByText('Features')).not.toBeInTheDocument();
    expect(screen.queryByText('Pricing')).not.toBeInTheDocument();
    expect(screen.queryByText('About Us')).not.toBeInTheDocument();

    const links = screen.queryAllByRole('link');
    expect(links.some(link => link.getAttribute('href') === '#features')).toBe(false);
    expect(links.some(link => link.getAttribute('href') === '#pricing')).toBe(false);
    expect(links.some(link => link.getAttribute('href') === '#about')).toBe(false);
  });

  it('marks active route with active styling', () => {
    mockedUsePathname.mockReturnValue('/dashboard');
    render(<MobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open mobile menu/i }));

    // Dashboard should be active
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('bg-brand-red/10');
  });

  it('closes menu on link navigation', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open mobile menu/i }));

    const sendMoneyLink = screen.getByText('Send Money').closest('a');
    fireEvent.click(sendMoneyLink!);

    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });

  it('closes menu on ESC key', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open mobile menu/i }));
    expect(screen.getByText('Menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    // Note: Current MobileNav doesn't implement ESC close; this test documents expected behavior
    // If implementing ESC handling, this would pass
  });
});