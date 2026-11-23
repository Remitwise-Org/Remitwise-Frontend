export type RecurringRemittance = {
  id: string;
  userAddress: string;
  recipientAddress: string;
  /** Amount in integer stroops (1 unit = 10,000,000 stroops). API consumers receive a decimal string via fromStroops(). */
  amountStroops: bigint;
  /** Decimal string representation for API consumers, e.g. "12.3456789" */
  amount: string;
  currency: string;
  frequency: "weekly" | "biweekly" | "monthly";
  nextRunAt: Date;
  lastRunAt?: Date;
  createdAt: Date;
};
