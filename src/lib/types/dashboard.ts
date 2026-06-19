export interface RemittanceSummary {
  totalSent: number;        // lifetime USD sent
  split: {                  // percentage breakdown by destination
    [currency: string]: number;
  };
  recentTransactions: Array<{
    id: string;
    amount: number;
    currency: string;
    recipient: string;
    status: "pending" | "completed" | "failed";
    createdAt: string;      // ISO-8601
  }>;
}

export interface SavingsSummary {
  savingsTotal: number;     // total across all goals
  recentGoals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;       // ISO-8601
    status: "active" | "completed" | "paused";
  }>;
}

export interface BillsSummary {
  billsPaidCount: number;
  billsPaidAmount: number;  // total amount paid this period
  unpaidBills: Array<{
    id: string;
    name: string;
    amount: number;
    dueDate: string;        // ISO-8601
    recurring: boolean;
    overdue: boolean;
  }>;
}

export interface InsuranceSummary {
  insurancePoliciesCount: number;
  insurancePremium: number; // total monthly premium across all active policies
  activePolicies: Array<{
    id: string;
    name: string;
    premium: number;
    coverageAmount: number;
    nextPaymentDate: string; // ISO-8601
    status: "active" | "lapsed" | "pending";
  }>;
}

export type SectionResult<T> =
  | ({ status: "ok" } & T)
  | { status: "error"; error: string };

export interface DashboardResponse {
  remittance: SectionResult<{
    totalSent: number;
    split: RemittanceSummary["split"];
    recentTransactions: RemittanceSummary["recentTransactions"];
  }>;
  savings: SectionResult<{
    savingsTotal: number;
    recentGoals: SavingsSummary["recentGoals"];
  }>;
  bills: SectionResult<{
    billsPaidCount: number;
    billsPaidAmount: number;
    unpaidBills: BillsSummary["unpaidBills"];
  }>;
  insurance: SectionResult<{
    insurancePoliciesCount: number;
    insurancePremium: number;
    activePolicies: InsuranceSummary["activePolicies"];
  }>;
  meta: {
    cachedAt: string;
    ttlSeconds: number;
    fromCache: boolean;
  };
}