import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SpendingVsSavingsChart } from '@/components/Insights/spendingVsSavingChart';

expect.extend(toHaveNoViolations);

describe('SpendingVsSavingsChart - Accessibility', () => {
  const mockData = [
    { month: 'Sep', spending: 2400, savings: 600 },
    { month: 'Oct', spending: 2800, savings: 700 },
    { month: 'Nov', spending: 3200, savings: 500 },
  ];

  it('should render with role="img" on chart container', () => {
    render(<SpendingVsSavingsChart data={mockData} />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toBeInTheDocument();
  });

  it('should have aria-label with chart title and data', () => {
    render(<SpendingVsSavingsChart data={mockData} />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toHaveAttribute('aria-label');
    const label = chartContainer.getAttribute('aria-label');
    expect(label).toContain('Spending vs Savings');
    expect(label).toContain('spending');
    expect(label).toContain('savings');
  });

  it('should have sr-only summary with aria-live="polite"', () => {
    render(<SpendingVsSavingsChart data={mockData} />);
    const srOnlyElements = screen.getAllByText(/Sep:.*spending.*savings/);
    const summary = srOnlyElements.find(el => el.classList.contains('sr-only'));
    expect(summary).toHaveAttribute('aria-live', 'polite');
  });

  it('should include all months in sr-only summary', () => {
    render(<SpendingVsSavingsChart data={mockData} />);
    const summary = screen.getByText(/Sep:.*Oct:.*Nov:/);
    expect(summary).toHaveClass('sr-only');
  });

  it('should have aria-label containing month samples', () => {
    render(<SpendingVsSavingsChart data={mockData} />);
    const label = screen.getByRole('img').getAttribute('aria-label');
    expect(label).toContain('Sep');
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<SpendingVsSavingsChart data={mockData} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
