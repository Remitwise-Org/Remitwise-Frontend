import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { RemittanceTrendChart } from '@/components/Insights/remittanceTrendChart';

expect.extend(toHaveNoViolations);

describe('RemittanceTrendChart - Accessibility', () => {
  const mockData = [
    { date: 'Sep 1', amount: 520, transactions: 2 },
    { date: 'Sep 8', amount: 780, transactions: 3 },
    { date: 'Sep 15', amount: 650, transactions: 2 },
  ];

  it('should render with role="img" on chart container', () => {
    render(<RemittanceTrendChart data={mockData} />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toBeInTheDocument();
  });

  it('should have aria-label with chart title', () => {
    render(<RemittanceTrendChart data={mockData} />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toHaveAttribute('aria-label');
    const label = chartContainer.getAttribute('aria-label');
    expect(label).toContain('Remittance Trend');
  });

  it('should have aria-label with data samples', () => {
    render(<RemittanceTrendChart data={mockData} />);
    const label = screen.getByRole('img').getAttribute('aria-label');
    expect(label).toContain('Sep');
    expect(label).toContain('520');
  });

  it('should have sr-only summary with aria-live="polite"', () => {
    render(<RemittanceTrendChart data={mockData} />);
    const srOnlyElements = screen.getAllByText(/Sep 1:.*Sep 8:/);
    const summary = srOnlyElements.find(el => el.classList.contains('sr-only'));
    expect(summary).toHaveAttribute('aria-live', 'polite');
  });

  it('should include all data points in sr-only summary', () => {
    render(<RemittanceTrendChart data={mockData} />);
    const summary = screen.getByText(/Sep 1:.*Sep 8:.*Sep 15:/);
    expect(summary).toHaveClass('sr-only');
  });

  it('should handle empty data gracefully', () => {
    render(<RemittanceTrendChart data={[]} />);
    expect(screen.getByText(/No remittance data yet/)).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<RemittanceTrendChart data={mockData} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
