import { StrKey, TransactionBuilder, Account, BASE_FEE, Networks, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { Contract } from "@stellar/stellar-sdk/contract";
import { FamilyMember, FamilyMemberRole } from "@/utils/types/family-wallet.types";
import { validateSpendingLimit } from "@/lib/validation/family-limits";
import { fitsInI128 } from "@/lib/utils/i128";

const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const HORIZON_URL = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const FAMILY_WALLET_CONTRACT_ID = process.env.FAMILY_WALLET_CONTRACT_ID ?? "";
const TX_TIMEOUT = 300;

const VALID_ROLES: FamilyMemberRole[] = ["admin", "sender", "recipient"];

function assertValidAddress(address: string, field: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw Object.assign(new Error(`Invalid Stellar address for ${field}`), { code: "INVALID_ADDRESS", status: 422 });
  }
}

function assertValidRole(role: string) {
  if (!VALID_ROLES.includes(role as FamilyMemberRole)) {
    throw Object.assign(new Error(`Invalid role: ${role}. Must be one of ${VALID_ROLES.join(", ")}`), { code: "INVALID_ROLE", status: 422 });
  }
}

function assertValidLimit(limit: number) {
  const v = validateSpendingLimit(limit);
  if (!v.isValid) throw Object.assign(new Error(v.error ?? "Invalid spending limit"), { code: "INVALID_LIMIT", status: 422 });
  if (!fitsInI128(limit)) throw Object.assign(new Error("Spending limit exceeds i128 max"), { code: "LIMIT_TOO_LARGE", status: 422 });
}

async function loadAccount(address: string): Promise<Account> {
  const { Horizon } = await import("@stellar/stellar-sdk");
  const server = new Horizon.Server(HORIZON_URL);
  return server.loadAccount(address);
}

export async function buildAddMemberTx(
  adminAddress: string,
  memberAddress: string,
  role: FamilyMemberRole,
  spendingLimit: number
): Promise<string> {
  assertValidAddress(adminAddress, "adminAddress");
  assertValidAddress(memberAddress, "memberAddress");
  assertValidRole(role);
  assertValidLimit(spendingLimit);

  if (!FAMILY_WALLET_CONTRACT_ID) throw new Error("FAMILY_WALLET_CONTRACT_ID is not configured");

  const account = await loadAccount(adminAddress);
  const contract = new Contract(FAMILY_WALLET_CONTRACT_ID);
  const limitStroops = BigInt(Math.round(spendingLimit * 1e7));

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "add_member",
        nativeToScVal(memberAddress, { type: "address" }),
        nativeToScVal(role, { type: "symbol" }),
        nativeToScVal(limitStroops, { type: "i128" }),
      ),
    )
    .setTimeout(TX_TIMEOUT)
    .build();

  return tx.toXDR();
}

export async function buildUpdateSpendingLimitTx(
  callerAddress: string,
  memberId: string,
  newLimit: number
): Promise<string> {
  assertValidAddress(callerAddress, "callerAddress");
  if (!memberId) throw Object.assign(new Error("memberId is required"), { code: "MISSING_MEMBER_ID", status: 422 });
  assertValidLimit(newLimit);

  if (!FAMILY_WALLET_CONTRACT_ID) throw new Error("FAMILY_WALLET_CONTRACT_ID is not configured");

  const account = await loadAccount(callerAddress);
  const contract = new Contract(FAMILY_WALLET_CONTRACT_ID);
  const limitStroops = BigInt(Math.round(newLimit * 1e7));

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "update_spending_limit",
        nativeToScVal(memberId, { type: "string" }),
        nativeToScVal(limitStroops, { type: "i128" }),
      ),
    )
    .setTimeout(TX_TIMEOUT)
    .build();

  return tx.toXDR();
}

export async function getMember(identifier: string): Promise<FamilyMember | null> {
  throw new Error("getMember: contract not yet deployed");
}

export async function getAllMembers(adminAddress?: string): Promise<FamilyMember[]> {
  throw new Error("getAllMembers: contract not yet deployed");
}

export async function checkSpendingLimit(
  memberId: string,
  amount: number,
): Promise<{ allowed: boolean; currentSpending: number; spendingLimit: number; remainingLimit: number }> {
  throw new Error("checkSpendingLimit: contract not yet deployed");
}
