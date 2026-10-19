// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Tooltip from '@/components/Tooltip';

expect.extend(toHaveNoViolations);

describe('Tooltip - Accessibility', () => {
  it('should have no violations when child is enabled', async () => {
    const { container } = render(
      <Tooltip content="Helpful info">
        <button>Click me</button>
      </Tooltip>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations when child is disabled with disabledReason', async () => {
    const { container } = render(
      <Tooltip disabledReason="Wallet not connected">
        <button disabled>Submit</button>
      </Tooltip>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have role="tooltip" on the tooltip element when visible', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip disabledReason="Missing precondition">
        <button disabled>Submit</button>
      </Tooltip>
    );

    const button = screen.getByRole('button');
    await user.hover(button);

    const tooltip = screen.getByTestId('disabled-tooltip');
    expect(tooltip).toHaveAttribute('role', 'tooltip');
  });

  it('should link trigger to tooltip via aria-describedby when visible', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip disabledReason="Missing precondition">
        <button disabled>Submit</button>
      </Tooltip>
    );

    const button = screen.getByRole('button');
    await user.hover(button);

    const tooltip = screen.getByTestId('disabled-tooltip');
    const describedby = button.getAttribute('aria-describedby');
    expect(describedby).toBe(tooltip.getAttribute('id'));
  });

  it('should not have aria-describedby when tooltip is hidden and child is enabled', () => {
    render(
      <Tooltip content="Helpful info">
        <button>Submit</button>
      </Tooltip>
    );

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('aria-describedby');
  });

  it('should have aria-live="polite" for screen reader announcements', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip disabledReason="Missing precondition">
        <button disabled>Submit</button>
      </Tooltip>
    );

    const button = screen.getByRole('button');
    await user.hover(button);

    const tooltip = screen.getByTestId('disabled-tooltip');
    expect(tooltip).toHaveAttribute('aria-live', 'polite');
  });
});