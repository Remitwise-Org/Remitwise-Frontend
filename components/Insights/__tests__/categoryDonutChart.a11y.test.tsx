import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { CategoryDonutChart } from '@/components/Insights/categoryDonutChart';

expect.extend(toHaveNoViolations);

describe('CategoryDonutChart - Accessibility', () => {
  const mockData = [
    { name: 'Family Support', amount: 1800, percentage: 56 },
    { name: 'Education', amount: 850, percentage: 26 },
    { name: 'Medical', amount: 390, percentage: 12 },
    { name: 'Emergency', amount: 200, percentage: 6 },
  ];

  it('should render with role="img" on chart container', () => {
    render(<CategoryDonutChart data={mockData} />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toBeInTheDocument();
  });

  it('should have aria-label with chart data summary', () => {
    render(<CategoryDonutChart data={mockData} />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toHaveAttribute('aria-label');
    const label = chartContainer.getAttribute('aria-label');
    expect(label).toContain('Top Categories');
    expect(label).toContain('Family Support');
    expect(label).toContain('56 percent');
  });

  it('should have sr-only summary with aria-live="polite"', () => {
    render(<CategoryDonutChart data={mockData} />);
    const summaries = screen.getAllByText(/Family Support.*56 percent/);
    const srOnlySummary = summaries.find(el => el.classList.contains('sr-only'));
    expect(srOnlySummary).toHaveAttribute('aria-live', 'polite');
  });

  it('should include all categories in aria-label', () => {
    render(<CategoryDonutChart data={mockData} />);
    const label = screen.getByRole('img').getAttribute('aria-label');
    expect(label).toContain('Family Support');
    expect(label).toContain('Education');
    expect(label).toContain('Medical');
    expect(label).toContain('Emergency');
  });

  it('should handle empty data gracefully', () => {
    const { container } = render(<CategoryDonutChart data={[]} />);
    // Should render without crashing
    expect(container).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<CategoryDonutChart data={mockData} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
