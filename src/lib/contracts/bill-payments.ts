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
  amount: number;
  dueDate: string;
  recurring: boolean;
  status: "paid" | "unpaid" | "cancelled";
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function validatePublicKey(key: string, error: string) {
  if (!/^G[A-Z0-9]{55}$/.test(key)) {
    throw new Error(error);
  }
}

function validateDueDate(date: string) {
  if (isNaN(Date.parse(date))) {
    throw new Error("invalid-dueDate");
  }
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

  validateDueDate(dueDate);

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