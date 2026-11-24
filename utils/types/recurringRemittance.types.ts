import type { RecurringFrequency } from '@/lib/remittance/recurring-frequency';

// TypeScript type for recurring remittance schedule
export type RecurringRemittance = {
  id: string;
  userAddress: string;
  recipientAddress: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  nextRunAt: Date;
  lastRunAt?: Date;
  createdAt: Date;
};
