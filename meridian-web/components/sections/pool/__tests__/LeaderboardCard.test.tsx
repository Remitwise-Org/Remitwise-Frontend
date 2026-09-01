import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeaderboardCard } from '../LeaderboardCard';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
      ol: ({ children, ...props }: React.ComponentProps<'ol'>) => <ol {...props}>{children}</ol>,
      li: ({ children, ...props }: React.ComponentProps<'li'>) => <li {...props}>{children}</li>,
    },
  };
});

vi.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({
    entries: [
      {
        rank: 1,
        name: 'Alice',
        xp: 1000,
        yieldAmount: '$100',
        verified: true,
        onChainProof: null,
      },
    ],
    total: 1,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('LeaderboardCard', () => {
  it('renders the leaderboard rows with proof status text', () => {
    render(<LeaderboardCard />);
    expect(screen.getAllByText('Missing proof').length).toBeGreaterThan(0);
  });
});
