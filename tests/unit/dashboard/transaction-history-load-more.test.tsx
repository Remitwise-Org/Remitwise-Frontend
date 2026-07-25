import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import TransactionHistoryLoadMore from '@/app/dashboard/transaction-history/components/transaction-history-load-more';

expect.extend(toHaveNoViolations);

describe('TransactionHistoryLoadMore', () => {
  it('renders a manual "load more" button that is always operable', () => {
    const onLoadMore = vi.fn();
    render(
      <TransactionHistoryLoadMore
        loading={false}
        onLoadMore={onLoadMore}
        sentinelRef={createRef<HTMLDivElement>()}
        label="Load more"
        loadingLabel="Loading..."
      />,
    );

    const button = screen.getByRole('button', { name: 'Load more' });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('disables the button and shows an accessible loading status while loading', () => {
    render(
      <TransactionHistoryLoadMore
        loading
        onLoadMore={vi.fn()}
        sentinelRef={createRef<HTMLDivElement>()}
        label="Load more"
        loadingLabel="Loading..."
      />,
    );

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('remains keyboard-operable regardless of pointer/scroll support', () => {
    const onLoadMore = vi.fn();
    render(
      <TransactionHistoryLoadMore
        loading={false}
        onLoadMore={onLoadMore}
        sentinelRef={createRef<HTMLDivElement>()}
        label="Load more"
        loadingLabel="Loading..."
      />,
    );

    const button = screen.getByRole('button', { name: 'Load more' });
    button.focus();
    expect(button).toHaveFocus();

    fireEvent.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <TransactionHistoryLoadMore
        loading={false}
        onLoadMore={vi.fn()}
        sentinelRef={createRef<HTMLDivElement>()}
        label="Load more"
        loadingLabel="Loading..."
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations while loading', async () => {
    const { container } = render(
      <TransactionHistoryLoadMore
        loading
        onLoadMore={vi.fn()}
        sentinelRef={createRef<HTMLDivElement>()}
        label="Load more"
        loadingLabel="Loading..."
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
