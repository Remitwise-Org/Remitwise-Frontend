import { getExplorerTxUrl, getClientNetwork } from "./explorer";

describe("explorer helper", () => {
  const OLD = process.env;

  afterEach(() => {
    process.env = { ...OLD };
  });

  it("returns null for empty or missing hash", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    expect(getExplorerTxUrl("")).toBeNull();
    expect(getExplorerTxUrl(undefined)).toBeNull();
    expect(getExplorerTxUrl(null)).toBeNull();
  });

  it("uses testnet path when NEXT_PUBLIC_STELLAR_NETWORK=testnet", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    const url = getExplorerTxUrl("ABC123");
    expect(url).toBe("https://stellar.expert/explorer/testnet/tx/ABC123");
  });

  it("uses public path when NEXT_PUBLIC_STELLAR_NETWORK=mainnet", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
    const url = getExplorerTxUrl("XYZ789");
    expect(url).toBe("https://stellar.expert/explorer/public/tx/XYZ789");
  });

  it("defaults to testnet for unknown network values", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "banana";
    expect(getClientNetwork()).toBe("testnet");
    const url = getExplorerTxUrl("HASH");
    expect(url).toBe("https://stellar.expert/explorer/testnet/tx/HASH");
  });

  it("prefers NEXT_PUBLIC_SOROBAN_NETWORK over NEXT_PUBLIC_STELLAR_NETWORK", () => {
    process.env.NEXT_PUBLIC_SOROBAN_NETWORK = "mainnet";
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    expect(getClientNetwork()).toBe("mainnet");
  });
});
