import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeaderboardCard } from '../LeaderboardCard';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    },
  };
});

describe('LeaderboardCard', () => {
  it('renders the leaderboard rows with proof status text', () => {
    render(<LeaderboardCard />);
    expect(screen.getAllByText('Missing proof').length).toBeGreaterThan(0);
  });
});
