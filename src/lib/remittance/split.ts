/**
 * Split configuration and allocation calculation for remittances.
 * Percentages define how a sent amount is allocated across spending, savings, bills, insurance.
 */

export interface SplitConfig {
  spending: number;   // percentage 0–100
  savings: number;
  bills: number;
  insurance: number;
}

/** Default allocation (must sum to 100). Matches split page defaults. */
export const DEFAULT_SPLIT_CONFIG: SplitConfig = {
  spending: 50,
  savings: 30,
  bills: 15,
  insurance: 5,
};

/** Allocated amounts in the same currency as the input amount */
export interface AllocationAmounts {
  spending: number;
  savings: number;
  bills: number;
  insurance: number;
}

/**
 * Get split config for a user. Without DB/contract integration, returns default.
 * Later: read from DB or remittance_split contract by user address.
 */
export function getSplitConfig(_userAddress?: string): SplitConfig {
  return { ...DEFAULT_SPLIT_CONFIG };
}

/**
 * Compute allocation amounts from a total amount and split config.
 * Uses integer rounding so sum may differ by up to 1 unit; spending gets the remainder.
 */
export function computeAllocation(
  amount: number,
  config: SplitConfig = DEFAULT_SPLIT_CONFIG
): AllocationAmounts {
  const totalPct = config.spending + config.savings + config.bills + config.insurance;
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error('Split config must sum to 100%');
  }
  const spending = Math.round((amount * config.spending) / 100);
  const savings = Math.round((amount * config.savings) / 100);
  const bills = Math.round((amount * config.bills) / 100);
  const insurance = Math.round((amount * config.insurance) / 100);
  const sum = spending + savings + bills + insurance;
  const diff = amount - sum;
  return {
    spending: spending + diff,
    savings,
    bills,
    insurance,
  };
}
