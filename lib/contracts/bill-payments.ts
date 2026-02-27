import {
  TransactionBuilder,
  Account,
  BASE_FEE,
  Networks,
  Operation,
} from "@stellar/stellar-sdk";

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

// ─────────────────────────────────────────────
// Create Bill
// ─────────────────────────────────────────────

export async function buildCreateBillTx(
  owner: string,
  name: string,
  amount: number,
  dueDate: string,
  isRecurring: boolean,
  frequencyDays: number
): Promise<string> {

  validatePublicKey(owner, "invalid-owner");

  if (amount <= 0) throw new Error("invalid-amount");

  if (isRecurring && frequencyDays <= 0) {
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
        value: frequencyDays.toString(),
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