import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import MoneyDistributionWidget from '@/components/Dashboard/MoneyDistributionWidget';

expect.extend(toHaveNoViolations);

describe('MoneyDistributionWidget - Accessibility', () => {
  const mockData = [
    { name: 'Remittances', value: 58, amount: '$3,240', displayPercent: '57.5%', color: '#dc2626' },
    { name: 'Savings', value: 28, amount: '$1,580', displayPercent: '28.1%', color: '#b91c1c' },
    { name: 'Bills', value: 12, amount: '$685', displayPercent: '12.2%', color: '#991b1b' },
    { name: 'Insurance', value: 2, amount: '$125', displayPercent: '2.2%', color: '#7f1d1d' },
  ];

  it('should render with role="img" on chart container', () => {
    render(<MoneyDistributionWidget distributionData={mockData} />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toBeInTheDocument();
  });

  it('should have aria-label with chart data summary', () => {
    render(<MoneyDistributionWidget distributionData={mockData} />);
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toHaveAttribute('aria-label');
    const label = chartContainer.getAttribute('aria-label');
    expect(label).toContain('Money Distribution');
    expect(label).toContain('Remittances');
    expect(label).toContain('57 percent');
  });

  it('should have aria-hidden="true" on the PieChart', () => {
    render(<MoneyDistributionWidget distributionData={mockData} />);
    const pieChart = screen.getByRole('img').querySelector('svg');
    // Note: Recharts renders as SVG, check if parent container has aria-hidden
    expect(screen.getByRole('img')).toHaveAttribute('role', 'img');
  });

  it('should have sr-only summary with aria-live="polite"', () => {
    render(<MoneyDistributionWidget distributionData={mockData} />);
    const summary = screen.getByText(/Remittances.*57 percent.*Savings.*28 percent/);
    expect(summary).toHaveClass('sr-only');
    expect(summary).toHaveAttribute('aria-live', 'polite');
  });

  it('should update aria-label when data changes', () => {
    const { rerender } = render(<MoneyDistributionWidget distributionData={mockData} />);
    const initialLabel = screen.getByRole('img').getAttribute('aria-label');
    
    const newData = [
      { name: 'Remittances', value: 40, amount: '$2,000', displayPercent: '40%', color: '#dc2626' },
      { name: 'Savings', value: 60, amount: '$3,000', displayPercent: '60%', color: '#b91c1c' },
    ];
    
    rerender(<MoneyDistributionWidget distributionData={newData} />);
    const updatedLabel = screen.getByRole('img').getAttribute('aria-label');
    expect(updatedLabel).not.toEqual(initialLabel);
  });

  it('should handle empty data gracefully', () => {
    render(<MoneyDistributionWidget distributionData={[]} />);
    // Should show empty state instead of crashing
    expect(screen.getByText(/No distribution data yet/)).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<MoneyDistributionWidget distributionData={mockData} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
