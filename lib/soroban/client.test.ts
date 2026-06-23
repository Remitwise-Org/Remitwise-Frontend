/**
 * Unit tests for lib/soroban/client.ts
 *
 * Covers:
 *  - getNetworkPassphrase() delegates to getSorobanNetworkPassphrase()
 *  - correct passphrase returned for testnet and mainnet
 *  - getServer() returns a SorobanRpc.Server instance
 *  - missing SOROBAN_RPC_URL throws in production
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Networks } from "@stellar/stellar-sdk";

// Keys managed per-test
const ENV_KEYS = [
  "SOROBAN_RPC_URL",
  "SOROBAN_NETWORK",
  "STELLAR_NETWORK",
  "NEXT_PUBLIC_STELLAR_NETWORK",
  "SOROBAN_NETWORK_PASSPHRASE",
  "NODE_ENV",
] as const;

describe("lib/soroban/client", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    // Provide a default RPC URL so module-level init doesn't throw
    process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = savedEnv[k];
      }
    }
    vi.resetModules();
  });

  describe("getNetworkPassphrase()", () => {
    it("returns testnet passphrase when SOROBAN_NETWORK=testnet", async () => {
      process.env.SOROBAN_NETWORK = "testnet";
      vi.resetModules();
      const { getNetworkPassphrase } = await import("./client");
      expect(getNetworkPassphrase()).toBe(Networks.TESTNET);
    });

    it("returns mainnet passphrase when SOROBAN_NETWORK=mainnet", async () => {
      process.env.SOROBAN_NETWORK = "mainnet";
      vi.resetModules();
      const { getNetworkPassphrase } = await import("./client");
      expect(getNetworkPassphrase()).toBe(Networks.PUBLIC);
    });

    it("defaults to testnet passphrase when SOROBAN_NETWORK is unset", async () => {
      delete process.env.SOROBAN_NETWORK;
      delete process.env.STELLAR_NETWORK;
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
      vi.resetModules();
      const { getNetworkPassphrase } = await import("./client");
      expect(getNetworkPassphrase()).toBe(Networks.TESTNET);
    });

    it("agrees with getSorobanNetworkPassphrase() from network-resolution", async () => {
      process.env.SOROBAN_NETWORK = "mainnet";
      vi.resetModules();
      const [{ getNetworkPassphrase }, { getSorobanNetworkPassphrase }] =
        await Promise.all([
          import("./client"),
          import("@/lib/contracts/network-resolution"),
        ]);
      expect(getNetworkPassphrase()).toBe(getSorobanNetworkPassphrase());
    });
  });

  describe("getServer()", () => {
    it("returns a SorobanRpc.Server instance", async () => {
      const { SorobanRpc } = await import("@stellar/stellar-sdk");
      const { getServer } = await import("./client");
      expect(getServer()).toBeInstanceOf(SorobanRpc.Server);
    });

    it("returns the same cached instance on repeated calls", async () => {
      const { getServer } = await import("./client");
      expect(getServer()).toBe(getServer());
    });
  });

  describe("SOROBAN_RPC_URL validation", () => {
    it("throws when SOROBAN_RPC_URL is missing in production", async () => {
      delete process.env.SOROBAN_RPC_URL;
      process.env.NODE_ENV = "production";
      vi.resetModules();
      await expect(import("./client")).rejects.toThrow(
        "SOROBAN_RPC_URL is required but not set."
      );
    });

    it("falls back to testnet URL in non-production when SOROBAN_RPC_URL is missing", async () => {
      delete process.env.SOROBAN_RPC_URL;
      process.env.NODE_ENV = "test";
      vi.resetModules();
      // Should not throw
      const { getServer } = await import("./client");
      expect(getServer()).toBeDefined();
    });
  });
});
