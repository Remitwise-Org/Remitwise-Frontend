import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAddMemberTx, buildUpdateSpendingLimitTx } from "./family-wallet";

const VALID_ADMIN = "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZLPXE";
const VALID_MEMBER = "GBVZZ5QKXB4T2YXQXDXQ2ZQKXB4T2YXQXDXQ2ZQKXB4T2YXQXDXQ2GQI";

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  return {
    ...actual,
    TransactionBuilder: vi.fn().mockImplementation(() => ({
      addOperation: vi.fn().mockReturnThis(),
      setTimeout: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({ toXDR: vi.fn().mockReturnValue("AAAAAA==") }),
    })),
  };
});

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<any>();
  class MockHorizonServer {
    loadAccount = vi.fn().mockResolvedValue({ accountId: () => VALID_ADMIN, incrementSequenceNumber: vi.fn(), sequence: "0" });
  }
  return {
    ...actual,
    Horizon: { Server: MockHorizonServer },
    TransactionBuilder: vi.fn().mockImplementation(() => ({
      addOperation: vi.fn().mockReturnThis(),
      setTimeout: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({ toXDR: vi.fn().mockReturnValue("AAAAAA==") }),
    })),
    nativeToScVal: vi.fn().mockReturnValue({}),
    Contract: vi.fn().mockImplementation(() => ({ call: vi.fn().mockReturnValue({}) })),
  };
});

beforeEach(() => {
  process.env.FAMILY_WALLET_CONTRACT_ID = "CCONTRACTIDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
});

describe("buildAddMemberTx", () => {
  it("returns XDR string for valid inputs", async () => {
    const xdr = await buildAddMemberTx(VALID_ADMIN, VALID_MEMBER, "sender", 100);
    expect(typeof xdr).toBe("string");
    expect(xdr.length).toBeGreaterThan(0);
  });

  it("throws INVALID_ADDRESS for bad adminAddress", async () => {
    await expect(buildAddMemberTx("INVALID", VALID_MEMBER, "sender", 100)).rejects.toMatchObject({ code: "INVALID_ADDRESS" });
  });

  it("throws INVALID_ADDRESS for bad memberAddress", async () => {
    await expect(buildAddMemberTx(VALID_ADMIN, "INVALID", "sender", 100)).rejects.toMatchObject({ code: "INVALID_ADDRESS" });
  });

  it("throws INVALID_ROLE for unknown role", async () => {
    await expect(buildAddMemberTx(VALID_ADMIN, VALID_MEMBER, "unknown" as any, 100)).rejects.toMatchObject({ code: "INVALID_ROLE" });
  });

  it("throws INVALID_LIMIT for negative limit", async () => {
    await expect(buildAddMemberTx(VALID_ADMIN, VALID_MEMBER, "sender", -1)).rejects.toMatchObject({ code: "INVALID_LIMIT" });
  });

  it("accepts limit of 0", async () => {
    const xdr = await buildAddMemberTx(VALID_ADMIN, VALID_MEMBER, "recipient", 0);
    expect(typeof xdr).toBe("string");
  });
});

describe("buildUpdateSpendingLimitTx", () => {
  it("returns XDR string for valid inputs", async () => {
    const xdr = await buildUpdateSpendingLimitTx(VALID_ADMIN, "member-1", 500);
    expect(typeof xdr).toBe("string");
  });

  it("throws INVALID_ADDRESS for bad callerAddress", async () => {
    await expect(buildUpdateSpendingLimitTx("BAD", "member-1", 100)).rejects.toMatchObject({ code: "INVALID_ADDRESS" });
  });

  it("throws MISSING_MEMBER_ID for empty memberId", async () => {
    await expect(buildUpdateSpendingLimitTx(VALID_ADMIN, "", 100)).rejects.toMatchObject({ code: "MISSING_MEMBER_ID" });
  });

  it("throws INVALID_LIMIT for negative limit", async () => {
    await expect(buildUpdateSpendingLimitTx(VALID_ADMIN, "member-1", -5)).rejects.toMatchObject({ code: "INVALID_LIMIT" });
  });
});
