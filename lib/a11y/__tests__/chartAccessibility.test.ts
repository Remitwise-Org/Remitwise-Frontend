import { describe, it, expect } from 'vitest';
import {
  generatePieChartLabel,
  generatePieChartSummary,
  generateTrendChartLabel,
  generateTrendChartSummary,
  generateBarChartLabel,
  generateBarChartSummary,
  formatCurrency,
  formatPercentage,
} from '@/lib/a11y';

describe('Chart Accessibility Helpers', () => {
  describe('generatePieChartLabel', () => {
    it('should generate a proper aria-label for pie chart', () => {
      const data = [
        { name: 'Savings', value: 40, displayPercent: '40%' },
        { name: 'Bills', value: 35, displayPercent: '35%' },
        { name: 'Spending', value: 25, displayPercent: '25%' },
      ];
      const label = generatePieChartLabel('Money Distribution', data);
      expect(label).toBe(
        'Money Distribution: Savings 40 percent, Bills 35 percent, Spending 25 percent'
      );
    });

    it('should handle empty data', () => {
      const label = generatePieChartLabel('Test Chart', []);
      expect(label).toBe('Test Chart: No data available');
    });

    it('should work with percentage property instead of displayPercent', () => {
      const data = [{ name: 'Test', percentage: 50 }];
      const label = generatePieChartLabel('Chart', data);
      expect(label).toContain('50 percent');
    });
  });

  describe('generatePieChartSummary', () => {
    it('should generate detailed sr-only summary', () => {
      const data = [
        { name: 'Savings', amount: 1000, percentage: 40 },
        { name: 'Bills', amount: 875, percentage: 35 },
      ];
      const summary = generatePieChartSummary(data);
      expect(summary).toContain('Savings');
      expect(summary).toContain('$1,000');
      expect(summary).toContain('40 percent');
    });

    it('should handle empty data', () => {
      const summary = generatePieChartSummary([]);
      expect(summary).toBe('No chart data available.');
    });
  });

  describe('generateTrendChartLabel', () => {
    it('should generate label with sample data points', () => {
      const data = [
        { month: 'Jul', remittances: 2800, savings: 1200 },
        { month: 'Aug', remittances: 3050, savings: 1350 },
        { month: 'Sep', remittances: 3200, savings: 1400 },
      ];
      const label = generateTrendChartLabel('6-Month Trends', data, ['remittances', 'savings']);
      expect(label).toContain('6-Month Trends');
      expect(label).toContain('Jul');
      expect(label).toContain('remittances');
    });

    it('should handle empty data', () => {
      const label = generateTrendChartLabel('Trends', [], ['amount']);
      expect(label).toBe('Trends: No data available');
    });

    it('should include first, middle, and last data points', () => {
      const data = [
        { month: 'Jan', amount: 100 },
        { month: 'Feb', amount: 200 },
        { month: 'Mar', amount: 300 },
        { month: 'Apr', amount: 400 },
        { month: 'May', amount: 500 },
      ];
      const label = generateTrendChartLabel('Test', data, ['amount']);
      expect(label).toContain('Jan');
      expect(label).toContain('May');
    });
  });

  describe('generateTrendChartSummary', () => {
    it('should generate detailed summary for all data points', () => {
      const data = [
        { date: 'Sep 1', amount: 520 },
        { date: 'Sep 8', amount: 780 },
      ];
      const summary = generateTrendChartSummary(data, ['amount']);
      expect(summary).toContain('Sep 1');
      expect(summary).toContain('$520');
      expect(summary).toContain('Sep 8');
      expect(summary).toContain('$780');
    });

    it('should handle empty data', () => {
      const summary = generateTrendChartSummary([], ['amount']);
      expect(summary).toBe('No chart data available.');
    });
  });

  describe('generateBarChartLabel', () => {
    it('should generate label for bar chart with two series', () => {
      const data = [
        { month: 'Sep', spending: 2400, savings: 600 },
        { month: 'Oct', spending: 2800, savings: 700 },
      ];
      const label = generateBarChartLabel('Spending vs Savings', data, 'spending', 'savings');
      expect(label).toContain('Spending vs Savings');
      expect(label).toContain('spending');
      expect(label).toContain('savings');
    });

    it('should handle empty data', () => {
      const label = generateBarChartLabel('Chart', [], 'a', 'b');
      expect(label).toBe('Chart: No data available');
    });
  });

  describe('generateBarChartSummary', () => {
    it('should generate summary with both series', () => {
      const data = [
        { month: 'Sep', spending: 2400, savings: 600 },
        { month: 'Oct', spending: 2800, savings: 700 },
      ];
      const summary = generateBarChartSummary(data, 'spending', 'savings');
      expect(summary).toContain('Sep');
      expect(summary).toContain('$2,400');
      expect(summary).toContain('$600');
    });
  });

  describe('formatCurrency', () => {
    it('should format number as currency', () => {
      expect(formatCurrency(1000)).toBe('1,000');
      expect(formatCurrency(1234.56)).toBe('1,235');
    });

    it('should handle locale parameter', () => {
      const formatted = formatCurrency(1000, 'en-US');
      expect(formatted).toBe('1,000');
    });

    it('should fallback to en-US for invalid locale', () => {
      const formatted = formatCurrency(1000, 'invalid-locale');
      expect(formatted).toBe('1,000');
    });
  });

  describe('formatPercentage', () => {
    it('should remove % symbol from string', () => {
      expect(formatPercentage('42%')).toBe('42');
    });

    it('should round number to string', () => {
      expect(formatPercentage(42.7)).toBe('43');
    });

    it('should handle numbers with decimals', () => {
      expect(formatPercentage(42.1)).toBe('42');
    });
  });
});
