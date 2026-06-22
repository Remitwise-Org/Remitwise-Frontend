import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import StatCard from '@/components/Dashboard/StatCard';

afterEach(cleanup);

describe('StatCard — reconciled prop API', () => {
  it('renders the legacy `percentage` prop as the trend text with an up indicator', () => {
    render(<StatCard title="Total Sent" value="$1,200" percentage="+18%" icon={null} />);

    expect(screen.getByText('+18%')).toBeInTheDocument();
    // Direction is conveyed non-color-only via an accessible label.
    expect(screen.getByRole('img', { name: /trending up/i })).toBeInTheDocument();
  });

  it('treats `0%` / trend="none" as a neutral (no-change) trend', () => {
    render(
      <StatCard title="Insurance" value="$125" percentage="0%" trend="none" icon={null} />
    );

    expect(screen.getByRole('img', { name: /no change/i })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /trending up/i })).not.toBeInTheDocument();
  });

  it('renders a down trend with its own directional label', () => {
    render(
      <StatCard title="Savings" value="$450" detail1="-5%" trend="down" icon={null} />
    );

    expect(screen.getByText('-5%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /trending down/i })).toBeInTheDocument();
  });

  it('prefers the canonical `detail1` over the legacy `percentage` alias', () => {
    render(
      <StatCard
        title="Total Sent"
        value="$1,200"
        detail1="+$240"
        percentage="+18%"
        icon={null}
      />
    );

    expect(screen.getByText('+$240')).toBeInTheDocument();
    expect(screen.queryByText('+18%')).not.toBeInTheDocument();
  });

  it('renders a contextual `detail2` row without showing a trend indicator', () => {
    render(
      <StatCard title="Total Sent" value="$1,200" detail2="12 transfers" icon={null} />
    );

    expect(screen.getByText('12 transfers')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies tabular-nums to the value for column alignment', () => {
    render(<StatCard title="Total Sent" value="$1,000,000.00" icon={null} />);

    const value = screen.getByText('$1,000,000.00');
    expect(value.className).toContain('tabular-nums');
  });
});
