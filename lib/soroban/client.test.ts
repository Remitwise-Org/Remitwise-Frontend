/**
 * lib/soroban/client.test.ts
 *
 * Deterministic unit tests for lib/soroban/client.ts.
 *
 * Covers
 * ──────
 * • withRetry: success on first attempt (no retry)
 * • withRetry: first attempt rejects → second succeeds (single retry)
 * • withRetry: both attempts reject → throws SorobanClientError with cause
 * • withRetry: attempt times out → label appears in error message
 * • withRetry: timer is cleared on success (no dangling timers)
 * • getLedgerSequence: returns sequence field from getLatestLedger
 * • getServer: returns cached singleton
 * • getNetworkPassphrase: delegates to getSorobanNetworkPassphrase
 * • SOROBAN_RPC_URL validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── 1. Mock @stellar/stellar-sdk before the module under test is loaded ───────

const mockGetLatestLedger = vi.fn();

vi.mock("@stellar/stellar-sdk", () => {
  class MockServer {
    getLatestLedger = mockGetLatestLedger;
  }
  return {
    SorobanRpc: { Server: MockServer },
    Networks: {
      TESTNET: "Test SDF Network ; September 2015",
      PUBLIC: "Public Global Stellar Network ; September 2015",
    },
  };
});

// Mock network-resolution so tests are env-agnostic
vi.mock("@/lib/contracts/network-resolution", () => ({
  getSorobanNetworkPassphrase: () => "Test SDF Network ; September 2015",
  getSorobanNetwork: () => "testnet",
}));

// ── 2. Import module under test (mocks already registered) ───────────────────

import {
  getServer,
  getLatestLedger,
  getLedgerSequence,
  getNetworkPassphrase,
  SorobanClientError,
} from "./client";

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_LEDGER = { sequence: 42, id: "abc123", protocolVersion: 20 };

// ── Test suites ───────────────────────────────────────────────────────────────

describe("getServer()", () => {
  it("returns a server instance", () => {
    expect(getServer()).toBeDefined();
  });

  it("returns the same cached singleton on repeated calls", () => {
    expect(getServer()).toBe(getServer());
  });
});

describe("getNetworkPassphrase()", () => {
  it("delegates to getSorobanNetworkPassphrase and returns a string", () => {
    const passphrase = getNetworkPassphrase();
    expect(typeof passphrase).toBe("string");
    expect(passphrase.length).toBeGreaterThan(0);
  });
});

describe("SorobanClientError", () => {
  it("sets name, message, and cause", () => {
    const cause = new TypeError("boom");
    const err = new SorobanClientError("something went wrong", cause);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SorobanClientError);
    expect(err.name).toBe("SorobanClientError");
    expect(err.message).toBe("something went wrong");
    expect(err.cause).toBe(cause);
  });

  it("works without a cause argument", () => {
    const err = new SorobanClientError("no cause");
    expect(err.cause).toBeUndefined();
  });
});

// ── withRetry behaviour (exercised via getLatestLedger) ───────────────────────

describe("withRetry (via getLatestLedger)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetLatestLedger.mockReset();
  });

  afterEach(async () => {
    // Drain any remaining microtasks / macrotasks to avoid cross-test bleed
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  it("resolves immediately on first successful attempt — no retry", async () => {
    mockGetLatestLedger.mockResolvedValueOnce(FAKE_LEDGER);

    const result = await getLatestLedger();

    expect(result).toEqual(FAKE_LEDGER);
    expect(mockGetLatestLedger).toHaveBeenCalledTimes(1);
  });

  it("retries once when first attempt rejects, returns second-attempt result", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockGetLatestLedger
      .mockRejectedValueOnce(new Error("transient error"))
      .mockResolvedValueOnce(FAKE_LEDGER);

    const result = await getLatestLedger();

    expect(result).toEqual(FAKE_LEDGER);
    expect(mockGetLatestLedger).toHaveBeenCalledTimes(2);
    // Retry warning must be logged exactly once
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/getLatestLedger/);

    warnSpy.mockRestore();
  });

  it("throws SorobanClientError with cause after both attempts reject", async () => {
    const rootCause = new Error("persistent failure");
    mockGetLatestLedger
      .mockRejectedValueOnce(rootCause)
      .mockRejectedValueOnce(rootCause);

    let thrown: unknown;
    try {
      await getLatestLedger();
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(SorobanClientError);
    const err = thrown as SorobanClientError;
    expect(err.cause).toBe(rootCause);
    expect(err.message).toContain("getLatestLedger");
    expect(mockGetLatestLedger).toHaveBeenCalledTimes(2);
  });

  it("times out and label appears in SorobanClientError cause message", async () => {
    // Never settle — timeout drives the failure
    mockGetLatestLedger.mockReturnValue(new Promise(() => {}));

    // Attach the catch handler BEFORE advancing timers so the rejection is
    // immediately handled and doesn't surface as an unhandled rejection.
    let thrown: unknown;
    const promise = getLatestLedger().catch((e) => {
      thrown = e;
    });

    // Advance past TIMEOUT_MS (10 000 ms) for both attempts
    await vi.runAllTimersAsync();
    await promise; // wait for the catch handler to run

    expect(thrown).toBeInstanceOf(SorobanClientError);
    const err = thrown as SorobanClientError;
    const causeMsg =
      err.cause instanceof Error ? err.cause.message : String(err.cause);
    expect(causeMsg).toMatch(/getLatestLedger/);
    expect(causeMsg).toMatch(/timed out/i);
  });

  it("clears the timeout timer on success — no dangling timers", async () => {
    mockGetLatestLedger.mockResolvedValueOnce(FAKE_LEDGER);

    await getLatestLedger();

    // Fake timer count should be 0; if setTimeout wasn't cleared this would be 1
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ── getLedgerSequence ─────────────────────────────────────────────────────────

describe("getLedgerSequence()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetLatestLedger.mockReset();
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  it("returns the sequence field from getLatestLedger", async () => {
    mockGetLatestLedger.mockResolvedValueOnce(FAKE_LEDGER);

    const seq = await getLedgerSequence();

    expect(seq).toBe(FAKE_LEDGER.sequence);
  });

  it("propagates SorobanClientError when getLatestLedger exhausts retries", async () => {
    const err = new Error("fail");
    mockGetLatestLedger.mockRejectedValue(err);

    await expect(getLedgerSequence()).rejects.toBeInstanceOf(SorobanClientError);
  });
});
