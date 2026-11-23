import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import SwapPage from '@/app/swap/page';

vi.mock('@/lib/hooks/useSeo', () => ({ useSeo: vi.fn() }));
vi.mock('@/components/PageHeadingLink', () => ({
  default: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

describe('SwapPage feature flag', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('keeps the swap form hidden when the feature flag is disabled', () => {
    vi.stubEnv('NEXT_PUBLIC_SWAP_PAGE_ENABLED', 'false');
    render(<SwapPage />);

    expect(screen.getByText('Asset Swaps are Coming Soon')).toBeInTheDocument();
    expect(screen.queryByLabelText('You pay')).not.toBeInTheDocument();
  });

  it('shows the live quote form when the feature flag is enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_SWAP_PAGE_ENABLED', 'true');
    render(<SwapPage />);

    expect(screen.getByLabelText('You pay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prepare unsigned swap' })).toBeDisabled();
  });
});
