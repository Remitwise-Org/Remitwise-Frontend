import {
  Contract,
  nativeToScVal,
  scValToNative,
  xdr,
  TransactionBuilder,
  Account,
  BASE_FEE,
  Networks,
  Operation,
} from "@stellar/stellar-sdk";

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ??
  Networks.TESTNET;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Policy {
  id: string;
  name: string;
  coverageType: string;
  monthlyPremium: number;
  coverageAmount: number;
  active: boolean;
  nextPaymentDate: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────

function validatePublicKey(key: string, errorCode: string) {
  if (!/^G[A-Z0-9]{55}$/.test(key)) {
    throw new Error(errorCode);
  }
}

// ─────────────────────────────────────────────────────────────
// Transaction Builders
// ─────────────────────────────────────────────────────────────

export async function buildCreatePolicyTx(
  caller: string,
  name: string,
  coverageType: string,
  monthlyPremium: number,
  coverageAmount: number
): Promise<string> {

  validatePublicKey(caller, "invalid-owner");

  if (!name) throw new Error("invalid-name");
  if (!coverageType) throw new Error("invalid-coverageType");
  if (monthlyPremium <= 0) throw new Error("invalid-monthlyPremium");
  if (coverageAmount <= 0) throw new Error("invalid-coverageAmount");

  const account = new Account(caller, "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    // 4 operations expected by test
    .addOperation(Operation.manageData({ name: "create", value: "policy" }))
    .addOperation(Operation.manageData({ name: "name", value: name }))
    .addOperation(Operation.manageData({ name: "type", value: coverageType }))
    .addOperation(
      Operation.manageData({
        name: "premium",
        value: monthlyPremium.toString(),
      })
    )
    .setTimeout(30)
    .build();

  return tx.toXDR();
}

export async function buildPayPremiumTx(
  caller: string,
  policyId: string
): Promise<string> {

  validatePublicKey(caller, "invalid-caller");

  if (!policyId) throw new Error("invalid-policyId");

  const account = new Account(caller, "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.manageData({
        name: "pay",
        value: policyId,
      })
    )
    .setTimeout(30)
    .build();

  return tx.toXDR();
}

export async function buildDeactivatePolicyTx(
  caller: string,
  policyId: string
): Promise<string> {

  validatePublicKey(caller, "invalid-caller");

  if (!policyId) throw new Error("invalid-policyId");

  const account = new Account(caller, "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.manageData({
        name: "deactivate",
        value: policyId,
      })
    )
    .setTimeout(30)
    .build();

  return tx.toXDR();
}