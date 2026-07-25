import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ParameterDiffView from '@/components/governance/ParameterDiffView';
import type { SplitPercentages } from '@/lib/validation/percentages';

describe('ParameterDiffView', () => {
  const currentParameters: SplitPercentages = {
    spending: 50,
    savings: 25,
    bills: 15,
    insurance: 10,
  };

  it('renders parameter changes correctly', () => {
    const proposedParameters: SplitPercentages = {
      spending: 40,
      savings: 30,
      bills: 20,
      insurance: 10,
    };

    render(
      <ParameterDiffView
        currentParameters={currentParameters}
        proposedParameters={proposedParameters}
      />
    );

    expect(screen.getByText('Parameter Changes')).toBeInTheDocument();
    expect(screen.getByText('Spending')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Insurance')).toBeInTheDocument();
  });

  it('shows current and proposed values', () => {
    const proposedParameters: SplitPercentages = {
      spending: 40,
      savings: 30,
      bills: 20,
      insurance: 10,
    };

    render(
      <ParameterDiffView
        currentParameters={currentParameters}
        proposedParameters={proposedParameters}
      />
    );

    expect(screen.getByText('50.0%')).toBeInTheDocument(); // Current spending
    expect(screen.getByText('40.0%')).toBeInTheDocument(); // Proposed spending
  });

  it('displays increase indicators for positive changes', () => {
    const proposedParameters: SplitPercentages = {
      spending: 40,
      savings: 35, // Increased from 25
      bills: 20,
      insurance: 5,
    };

    render(
      <ParameterDiffView
        currentParameters={currentParameters}
        proposedParameters={proposedParameters}
      />
    );

    expect(screen.getByText(/+10\.0/)).toBeInTheDocument(); // Savings increase
  });

  it('displays decrease indicators for negative changes', () => {
    const proposedParameters: SplitPercentages = {
      spending: 30, // Decreased from 50
      savings: 35,
      bills: 25,
      insurance: 10,
    };

    render(
      <ParameterDiffView
        currentParameters={currentParameters}
        proposedParameters={proposedParameters}
      />
    );

    expect(screen.getByText(/-20\.0/)).toBeInTheDocument(); // Spending decrease
  });

  it('shows no change indicator when values are identical', () => {
    const proposedParameters: SplitPercentages = {
      spending: 50,
      savings: 25,
      bills: 15,
      insurance: 10,
    };

    render(
      <ParameterDiffView
        currentParameters={currentParameters}
        proposedParameters={proposedParameters}
      />
    );

    expect(screen.getByText('No changes proposed')).toBeInTheDocument();
    expect(screen.getByText('No change')).toBeInTheDocument();
  });

  it('displays summary with count of changed parameters', () => {
    const proposedParameters: SplitPercentages = {
      spending: 40,
      savings: 30,
      bills: 20,
      insurance: 10, // No change
    };

    render(
      <ParameterDiffView
        currentParameters={currentParameters}
        proposedParameters={proposedParameters}
      />
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('3 / 4')).toBeInTheDocument(); // 3 out of 4 changed
  });

  it('applies custom className', () => {
    const proposedParameters: SplitPercentages = {
      spending: 40,
      savings: 30,
      bills: 20,
      insurance: 10,
    };

    const { container } = render(
      <ParameterDiffView
        currentParameters={currentParameters}
        proposedParameters={proposedParameters}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles floating point precision correctly', () => {
    const proposedParameters: SplitPercentages = {
      spending: 50.01,
      savings: 24.99,
      bills: 15,
      insurance: 10,
    };

    render(
      <ParameterDiffView
        currentParameters={currentParameters}
        proposedParameters={proposedParameters}
      />
    );

    // Small floating point differences should be treated as no change
    expect(screen.getByText('No changes proposed')).toBeInTheDocument();
  });
});
