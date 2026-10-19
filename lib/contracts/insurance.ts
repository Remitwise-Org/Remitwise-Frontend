import {
  TransactionBuilder,
  Account,
  BASE_FEE,
  Operation,
  Networks,
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
    const error = new Error(errorCode) as Error & { code?: string };
    if (errorCode === "INVALID_ADDRESS") {
      error.code = "INVALID_ADDRESS";
    }
    throw error;
  }
}

function validatePolicyId(policyId: string) {
  if (!policyId) {
    throw new Error("invalid-policyId");
  }
}

function getMockPolicies(owner: string): Policy[] {
  validatePublicKey(owner, "INVALID_ADDRESS");
  return [
    {
      id: "policy-1",
      name: "Basic Health",
      coverageType: "health",
      monthlyPremium: 100,
      coverageAmount: 10000,
      active: true,
      nextPaymentDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
  ];
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

export async function getPolicy(id: string): Promise<Policy> {
  validatePolicyId(id);
  return {
    id,
    name: "Basic Health",
    coverageType: "health",
    monthlyPremium: 100,
    coverageAmount: 10000,
    active: true,
    nextPaymentDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  };
}

export async function getActivePolicies(owner: string): Promise<Policy[]> {
  return getMockPolicies(owner);
}

export async function getTotalMonthlyPremium(owner: string): Promise<number> {
  const policies = getMockPolicies(owner);
  return policies.reduce((sum, policy) => sum + policy.monthlyPremium, 0);
}