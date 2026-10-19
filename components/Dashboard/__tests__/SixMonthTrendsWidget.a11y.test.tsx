import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import SixMonthTrendsWidget from '@/components/Dashboard/SixMonthTrendsWidget';

expect.extend(toHaveNoViolations);

describe('SixMonthTrendsWidget - Accessibility', () => {
  it('should render with role="img" on chart container', () => {
    render(<SixMonthTrendsWidget />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toBeInTheDocument();
  });

  it('should have aria-label with chart title', () => {
    render(<SixMonthTrendsWidget />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toHaveAttribute('aria-label');
    const label = chartContainer.getAttribute('aria-label');
    expect(label).toContain('6-Month Trends');
  });

  it('should have aria-label containing data series names', () => {
    render(<SixMonthTrendsWidget />);
    const label = screen.getByRole('img').getAttribute('aria-label');
    expect(label).toContain('remittances');
    expect(label).toContain('savings');
    expect(label).toContain('bills');
  });

  it('should have sr-only summary with aria-live="polite"', () => {
    render(<SixMonthTrendsWidget />);
    // Find the sr-only element
    const srOnlyElements = screen.getByText(/Jul:.*remittances/);
    expect(srOnlyElements).toHaveClass('sr-only');
    expect(srOnlyElements).toHaveAttribute('aria-live', 'polite');
  });

  it('should have sr-only summary with all months data', () => {
    render(<SixMonthTrendsWidget />);
    const summary = screen.getByText(/Jul:.*Aug:.*Sep:/);
    expect(summary).toHaveClass('sr-only');
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<SixMonthTrendsWidget />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
