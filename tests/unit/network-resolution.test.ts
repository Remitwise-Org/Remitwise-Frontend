import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Networks } from "@stellar/stellar-sdk";
import {
  getSorobanNetwork,
  getSorobanNetworkPassphrase,
  resolveContractId,
  getResolvedContractIds,
  type ContractName,
} from "@/lib/contracts/network-resolution";

// Env vars touched by the module under test. We snapshot/restore process.env
// around every test so ordering and leakage can't affect assertions.
const ENV_KEYS = [
  "SOROBAN_NETWORK",
  "STELLAR_NETWORK",
  "NEXT_PUBLIC_STELLAR_NETWORK",
  "CONTRACT_IDS_JSON",
  // REMITTANCE_SPLIT candidates (in precedence order)
  "REMITTANCE_SPLIT_CONTRACT_ID",
  "REMITTANCE_CONTRACT_ID",
  "NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID",
  "NEXT_PUBLIC_SPLIT_CONTRACT_ID",
  "REMITTANCE_SPLIT_CONTRACT_ID_TESTNET",
  "REMITTANCE_SPLIT_CONTRACT_ID_MAINNET",
  // other contracts' first candidate
  "SAVINGS_GOALS_CONTRACT_ID",
  "BILL_PAYMENTS_CONTRACT_ID",
  "INSURANCE_CONTRACT_ID",
  "FAMILY_WALLET_CONTRACT_ID",
];

let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  snapshot = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

describe("getSorobanNetwork", () => {
  it("defaults to testnet when nothing is set", () => {
    expect(getSorobanNetwork()).toBe("testnet");
  });

  it("reads SOROBAN_NETWORK first", () => {
    process.env.SOROBAN_NETWORK = "mainnet";
    process.env.STELLAR_NETWORK = "testnet";
    expect(getSorobanNetwork()).toBe("mainnet");
  });

  it("falls back to STELLAR_NETWORK then NEXT_PUBLIC_STELLAR_NETWORK", () => {
    process.env.STELLAR_NETWORK = "mainnet";
    expect(getSorobanNetwork()).toBe("mainnet");
    delete process.env.STELLAR_NETWORK;
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
    expect(getSorobanNetwork()).toBe("mainnet");
  });

  it("throws on an unsupported network value", () => {
    process.env.SOROBAN_NETWORK = "futurenet";
    expect(() => getSorobanNetwork()).toThrow(/Invalid SOROBAN_NETWORK/);
  });
});

describe("getSorobanNetworkPassphrase", () => {
  it("maps testnet to the TESTNET passphrase", () => {
    process.env.SOROBAN_NETWORK = "testnet";
    expect(getSorobanNetworkPassphrase()).toBe(Networks.TESTNET);
  });

  it("maps mainnet to the PUBLIC passphrase", () => {
    process.env.SOROBAN_NETWORK = "mainnet";
    expect(getSorobanNetworkPassphrase()).toBe(Networks.PUBLIC);
  });
});

describe("resolveContractId - candidate precedence", () => {
  it("prefers the first defined env candidate for REMITTANCE_SPLIT", () => {
    process.env.REMITTANCE_SPLIT_CONTRACT_ID = "PRIMARY";
    process.env.REMITTANCE_CONTRACT_ID = "FALLBACK";
    process.env.NEXT_PUBLIC_SPLIT_CONTRACT_ID = "PUBLIC";
    expect(resolveContractId("REMITTANCE_SPLIT")).toBe("PRIMARY");
  });

  it("uses a later candidate when only the fallback is set", () => {
    process.env.NEXT_PUBLIC_SPLIT_CONTRACT_ID = "ONLY_FALLBACK";
    expect(resolveContractId("REMITTANCE_SPLIT")).toBe("ONLY_FALLBACK");
  });

  it("ignores empty-string env values and uses the next candidate", () => {
    process.env.REMITTANCE_SPLIT_CONTRACT_ID = "   ";
    process.env.REMITTANCE_CONTRACT_ID = "REAL";
    expect(resolveContractId("REMITTANCE_SPLIT")).toBe("REAL");
  });

  it("prefers a network-scoped env var over the bare one", () => {
    process.env.SOROBAN_NETWORK = "testnet";
    process.env.REMITTANCE_SPLIT_CONTRACT_ID = "BARE";
    process.env.REMITTANCE_SPLIT_CONTRACT_ID_TESTNET = "SCOPED";
    expect(resolveContractId("REMITTANCE_SPLIT")).toBe("SCOPED");
  });

  it("resolves each contract from its first candidate", () => {
    process.env.REMITTANCE_SPLIT_CONTRACT_ID = "R";
    process.env.SAVINGS_GOALS_CONTRACT_ID = "S";
    process.env.BILL_PAYMENTS_CONTRACT_ID = "B";
    process.env.INSURANCE_CONTRACT_ID = "I";
    process.env.FAMILY_WALLET_CONTRACT_ID = "F";
    const expected: Record<ContractName, string> = {
      REMITTANCE_SPLIT: "R",
      SAVINGS_GOALS: "S",
      BILL_PAYMENTS: "B",
      INSURANCE: "I",
      FAMILY_WALLET: "F",
    };
    for (const name of Object.keys(expected) as ContractName[]) {
      expect(resolveContractId(name)).toBe(expected[name]);
    }
  });
});

describe("resolveContractId - CONTRACT_IDS_JSON precedence", () => {
  it("prefers the network-scoped JSON value over env vars", () => {
    process.env.SOROBAN_NETWORK = "mainnet";
    process.env.REMITTANCE_SPLIT_CONTRACT_ID = "FROM_ENV";
    process.env.CONTRACT_IDS_JSON = JSON.stringify({
      mainnet: { REMITTANCE_SPLIT_CONTRACT_ID: "FROM_JSON" },
    });
    expect(resolveContractId("REMITTANCE_SPLIT")).toBe("FROM_JSON");
  });

  it("falls through to env when JSON lacks the current network section", () => {
    process.env.SOROBAN_NETWORK = "mainnet";
    process.env.REMITTANCE_SPLIT_CONTRACT_ID = "FROM_ENV";
    process.env.CONTRACT_IDS_JSON = JSON.stringify({
      testnet: { REMITTANCE_SPLIT_CONTRACT_ID: "WRONG_NET" },
    });
    expect(resolveContractId("REMITTANCE_SPLIT")).toBe("FROM_ENV");
  });

  it("throws when CONTRACT_IDS_JSON is invalid JSON", () => {
    process.env.CONTRACT_IDS_JSON = "{not valid";
    expect(() => resolveContractId("REMITTANCE_SPLIT")).toThrow(
      /not valid JSON/
    );
  });
});

describe("resolveContractId - unresolved case", () => {
  it("throws a clear error when nothing is configured", () => {
    expect(() => resolveContractId("REMITTANCE_SPLIT")).toThrow(
      /Missing contract ID for REMITTANCE_SPLIT on testnet/
    );
  });
});

describe("getResolvedContractIds", () => {
  it("returns resolved ids and null for unresolved contracts", () => {
    process.env.REMITTANCE_SPLIT_CONTRACT_ID = "R";
    const result = getResolvedContractIds();
    expect(result.REMITTANCE_SPLIT).toBe("R");
    expect(result.SAVINGS_GOALS).toBeNull();
    expect(result.BILL_PAYMENTS).toBeNull();
    expect(result.INSURANCE).toBeNull();
    expect(result.FAMILY_WALLET).toBeNull();
  });

  it("returns all-null when no env is set", () => {
    const result = getResolvedContractIds();
    expect(Object.values(result).every((v) => v === null)).toBe(true);
  });
});
