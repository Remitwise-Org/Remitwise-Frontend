// TypeScript type for recurring remittance schedule
export type RecurringRemittance = {
  id: string;
  userAddress: string;
  recipientAddress: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  nextRunAt: Date;
  lastRunAt?: Date;
  createdAt: Date;
};
