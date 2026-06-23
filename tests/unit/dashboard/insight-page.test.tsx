// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InsightPage from '@/app/dashboard/insight/page';
import { apiClient } from '@/lib/client/apiClient';

vi.mock('@/lib/client/apiClient', () => ({
    apiClient: {
        getJson: vi.fn(),
    },
}));

vi.mock('@/components/Insights/categoryDonutChart', () => ({
    CategoryDonutChart: ({ data }: { data: any }) => <div data-testid="category-chart">{JSON.stringify(data)}</div>
}));

vi.mock('@/components/Insights/remittanceTrendChart', () => ({
    RemittanceTrendChart: ({ data }: { data: any }) => <div data-testid="trend-chart">{JSON.stringify(data)}</div>
}));

const mockData = {
    period: 'current_month',
    spendingTotal: 500,
    savingsTotal: 200,
    billsTotal: 300,
    insuranceTotal: 150,
    breakdown: { Food: 500, Electricity: 300 },
    trend: { '2026-1': 800, '2026-2': 350 },
};

describe('InsightPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', async () => {
        // Return unresolved promise to keep it in loading state
        vi.mocked(apiClient.getJson).mockReturnValue(new Promise(() => {}));
        render(<InsightPage />);
        expect(screen.getByText('Financial Insights')).toBeInTheDocument();
        // Since we mock SkeletonCard, let's just check if it renders
        // Actually SkeletonCard is not mocked, so we check for shimmer
        expect(document.querySelector('.animate-shimmer')).toBeInTheDocument();
    });

    it('renders error state if API fails', async () => {
        vi.mocked(apiClient.getJson).mockRejectedValue(new Error('Network failure'));
        render(<InsightPage />);
        
        await waitFor(() => {
            expect(screen.getByText('Failed to load insights')).toBeInTheDocument();
            expect(screen.getByText('Network failure')).toBeInTheDocument();
        });
    });

    it('renders empty state if no data returned', async () => {
        vi.mocked(apiClient.getJson).mockResolvedValue(null);
        render(<InsightPage />);
        
        await waitFor(() => {
            expect(screen.getByText('No data available')).toBeInTheDocument();
        });
    });

    it('renders empty activity state if totals are 0', async () => {
        vi.mocked(apiClient.getJson).mockResolvedValue({
            ...mockData,
            spendingTotal: 0,
            savingsTotal: 0,
            billsTotal: 0,
            insuranceTotal: 0,
            breakdown: {},
            trend: {}
        });
        render(<InsightPage />);
        
        await waitFor(() => {
            expect(screen.getByText('No activity')).toBeInTheDocument();
        });
    });

    it('renders data correctly', async () => {
        vi.mocked(apiClient.getJson).mockResolvedValue(mockData);
        render(<InsightPage />);
        
        await waitFor(() => {
            expect(screen.getByText('Spending')).toBeInTheDocument();
            expect(screen.getByText('$500.00')).toBeInTheDocument();
            expect(screen.getByText('Savings')).toBeInTheDocument();
            expect(screen.getByText('$200.00')).toBeInTheDocument();
            
            expect(screen.getByTestId('category-chart')).toBeInTheDocument();
            expect(screen.getByTestId('trend-chart')).toBeInTheDocument();
        });
    });

    it('re-queries on period change', async () => {
        vi.mocked(apiClient.getJson).mockResolvedValue(mockData);
        render(<InsightPage />);
        
        await waitFor(() => {
            expect(apiClient.getJson).toHaveBeenCalledWith(expect.stringContaining('period=current_month'), expect.any(Object));
        });

        const select = screen.getByRole('combobox', { name: 'Select period' });
        fireEvent.change(select, { target: { value: 'last_3_months' } });

        await waitFor(() => {
            expect(apiClient.getJson).toHaveBeenCalledWith(expect.stringContaining('period=last_3_months'), expect.any(Object));
        });
    });

    it('handles stale requests on period switch (abort)', async () => {
        let abortSignal: AbortSignal | undefined;
        vi.mocked(apiClient.getJson).mockImplementation((url, init) => {
            if (init?.signal) abortSignal = init.signal;
            return Promise.resolve(mockData);
        });

        const { unmount } = render(<InsightPage />);
        
        await waitFor(() => {
            expect(apiClient.getJson).toHaveBeenCalledTimes(1);
        });

        const prevSignal = abortSignal;
        
        // Change period
        const select = screen.getByRole('combobox', { name: 'Select period' });
        fireEvent.change(select, { target: { value: 'last_3_months' } });

        // Previous request should be aborted
        expect(prevSignal?.aborted).toBe(true);
        
        await waitFor(() => {
            expect(apiClient.getJson).toHaveBeenCalledTimes(2);
        });
    });
});
