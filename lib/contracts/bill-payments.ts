import {
  TransactionBuilder,
  Account,
  BASE_FEE,
  Networks,
  Operation,
} from "@stellar/stellar-sdk";

export interface Bill {
  id: string;
  owner: string;
  name: string;
  // UI helpers used across components (optional to avoid breaking contract usage)
  title?: string;
  category?: string;
  daysInfo?: string;
  amount: number;
  dueDate: string;
  recurring: boolean;
  isRecurring?: boolean;
  recurrenceLabel?: string;
  nextOccurrence?: string;
  // include presentation statuses used by the UI
  status: "paid" | "unpaid" | "cancelled" | "overdue" | "urgent" | "upcoming";
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function validatePublicKey(key: string, error: string) {
  if (!/^G[A-Z0-9]{55}$/.test(key)) {
    throw new Error(error);
  }
}

/**
 * Validates that a due-date string is both parseable **and** strictly in the
 * future (> now at millisecond precision).
 *
 * Rejection criteria:
 *  - Not a valid ISO / parseable date string           → "invalid-dueDate"
 *  - Unix epoch zero  ("0", "1970-01-01T00:00:00Z")   → "dueDate-in-past"
 *  - Any timestamp ≤ Date.now()                        → "dueDate-in-past"
 *
 * Exported so the API route and tests can call it independently.
 */
export function validateDueDateNotPast(date: string): void {
  const parsed = Date.parse(date);
  if (isNaN(parsed)) {
    throw new Error("invalid-dueDate");
  }
  if (parsed <= Date.now()) {
    throw new Error("dueDate-in-past");
  }
}

/**
 * Given a frequency in days, returns the ISO string of the *next* occurrence
 * that is strictly after the current moment.
 *
 * If the naive `baseDate + frequencyDays` falls in the past (e.g. the bill was
 * last processed days ago), the function keeps advancing by `frequencyDays`
 * until the result is in the future — guaranteeing the returned date always
 * passes `validateDueDateNotPast`.
 *
 * @param baseDateStr - ISO date string of the last due date (or bill creation date).
 * @param frequencyDays - Positive integer recurrence interval.
 * @returns ISO string of the next due date that is strictly > now.
 */
export function nextDueDateFromNow(
  baseDateStr: string,
  frequencyDays: number
): string {
  if (isNaN(Date.parse(baseDateStr))) {
    throw new Error("invalid-dueDate");
  }
  if (!frequencyDays || frequencyDays <= 0) {
    throw new Error("invalid-frequency");
  }

  const stepMs = frequencyDays * 86_400_000;
  const now = Date.now();
  let next = Date.parse(baseDateStr);

  // Advance until we land strictly after now.
  // Maximum iterations guard (prevents infinite loop on absurdly small step).
  let iterations = 0;
  const MAX_ITERATIONS = 100_000;
  while (next <= now) {
    next += stepMs;
    if (++iterations > MAX_ITERATIONS) {
      throw new Error("invalid-frequency");
    }
  }

  return new Date(next).toISOString();
}

function getMockBills(owner: string): Bill[] {
  validatePublicKey(owner, "invalid-owner");
  const now = Date.now();
  return [
    {
      id: "bill-1",
      owner,
      name: "Electric Bill",
      amount: 50,
      dueDate: new Date(now + 7 * 86400000).toISOString(),
      recurring: true,
      status: "unpaid",
    },
    {
      id: "bill-2",
      owner,
      name: "Internet Bill",
      amount: 80,
      dueDate: new Date(now - 3 * 86400000).toISOString(),
      recurring: true,
      status: "paid",
    },
  ];
}

// ─────────────────────────────────────────────
// Create Bill
// ─────────────────────────────────────────────

export async function buildCreateBillTx(
  owner: string,
  name: string,
  amount: number,
  dueDate: string,
  isRecurring: boolean,
  frequencyDays?: number
): Promise<string> {

  validatePublicKey(owner, "invalid-owner");

  if (amount <= 0) throw new Error("invalid-amount");

  if (isRecurring && (!frequencyDays || frequencyDays <= 0)) {
    throw new Error("invalid-frequency");
  }

  validateDueDateNotPast(dueDate);

  const account = new Account(owner, "0");

  const txBuilder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  });

  // Tests expect:
  // one-time → 4 operations
  // recurring → 5 operations

  txBuilder.addOperation(Operation.manageData({ name: "name", value: name }));
  txBuilder.addOperation(Operation.manageData({ name: "amount", value: amount.toString() }));
  txBuilder.addOperation(Operation.manageData({ name: "dueDate", value: dueDate }));
  txBuilder.addOperation(
    Operation.manageData({
      name: "type",
      value: isRecurring ? "recurring" : "one-time",
    })
  );

  if (isRecurring) {
    txBuilder.addOperation(
      Operation.manageData({
        name: "frequency",
        value: String(frequencyDays),
      })
    );
  }

  const tx = txBuilder.setTimeout(30).build();

  return tx.toXDR();
}

// ─────────────────────────────────────────────
// Pay Bill
// ─────────────────────────────────────────────

export async function buildPayBillTx(
  caller: string,
  billId: string
): Promise<string> {

  validatePublicKey(caller, "invalid-caller");

  if (!billId) throw new Error("invalid-billId");

  const account = new Account(caller, "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.manageData({ name: "pay", value: billId }))
    .setTimeout(30)
    .build();

  return tx.toXDR();
}

// ─────────────────────────────────────────────
// Cancel Bill
// ─────────────────────────────────────────────

export async function buildCancelBillTx(
  caller: string,
  billId: string
): Promise<string> {

  validatePublicKey(caller, "invalid-caller");

  if (!billId) throw new Error("invalid-billId");

  const account = new Account(caller, "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.manageData({ name: "cancel", value: billId }))
    .setTimeout(30)
    .build();

  return tx.toXDR();
}

export async function getAllBills(owner: string): Promise<Bill[]> {
  return getMockBills(owner);
}

export async function getBill(id: string, owner: string): Promise<Bill> {
  if (!id) {
    throw new Error("invalid-billId");
  }
  const bill = getMockBills(owner).find((item) => item.id === id);
  if (!bill) {
    throw new Error("not-found");
  }
  return bill;
}

export async function getUnpaidBills(owner: string): Promise<Bill[]> {
  return (await getAllBills(owner)).filter((bill) => bill.status !== "paid");
}

export async function getTotalUnpaid(owner: string): Promise<number> {
  const bills = await getUnpaidBills(owner);
  return bills.reduce((sum, bill) => sum + bill.amount, 0);
}