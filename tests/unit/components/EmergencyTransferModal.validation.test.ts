import { describe, it, expect } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { isValidStellarAddress } from "@/components/Dashboard/EmergencyTransferModal";

describe("EmergencyTransferModal isValidStellarAddress", () => {
  it("accepts a valid ed25519 public key", () => {
    const address = Keypair.random().publicKey();
    expect(isValidStellarAddress(address)).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    const address = Keypair.random().publicKey();
    expect(isValidStellarAddress(`  ${address}  `)).toBe(true);
  });

  it("rejects empty and malformed addresses", () => {
    expect(isValidStellarAddress("")).toBe(false);
    expect(isValidStellarAddress("not-an-address")).toBe(false);
    // A contract address (C...) is not a valid ed25519 public key.
    expect(isValidStellarAddress("G" + "A".repeat(55))).toBe(false);
  });
});
