/**
 * Governance proposal types for parameter change proposals
 */

import type { SplitPercentages } from '@/lib/validation/percentages';

export type ProposalStatus = 'pending' | 'active' | 'executed' | 'rejected' | 'expired';

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  currentParameters: SplitPercentages;
  proposedParameters: SplitPercentages;
  status: ProposalStatus;
  createdAt: string;
  expiresAt?: string;
  executedAt?: string;
  votesFor: number;
  votesAgainst: number;
}

export interface ParameterChange {
  key: keyof SplitPercentages;
  currentValue: number;
  proposedValue: number;
  change: number;
  changePercent: number;
}

/**
 * Calculate the differences between current and proposed parameters
 */
export function calculateParameterDiff(
  current: SplitPercentages,
  proposed: SplitPercentages
): ParameterChange[] {
  const keys: (keyof SplitPercentages)[] = ['spending', 'savings', 'bills', 'insurance'];
  
  return keys.map((key) => {
    const currentValue = current[key];
    const proposedValue = proposed[key];
    const change = proposedValue - currentValue;
    const changePercent = currentValue !== 0 ? (change / currentValue) * 100 : 0;
    
    return {
      key,
      currentValue,
      proposedValue,
      change,
      changePercent,
    };
  });
}

/**
 * Check if a proposal has any actual changes
 */
export function hasChanges(current: SplitPercentages, proposed: SplitPercentages): boolean {
  const diff = calculateParameterDiff(current, proposed);
  return diff.some((change) => Math.abs(change.change) > 0.01);
}
