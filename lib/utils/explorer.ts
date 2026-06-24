export type ExplorerNetwork = "testnet" | "mainnet";

function isExplorerNetwork(n: string | undefined): n is ExplorerNetwork {
  return n === "testnet" || n === "mainnet";
}

export function getClientNetwork(): ExplorerNetwork {
  const raw =
    // client-exposed env vars only
    process.env.NEXT_PUBLIC_SOROBAN_NETWORK ??
    process.env.NEXT_PUBLIC_STELLAR_NETWORK ??
    "testnet";

  if (!isExplorerNetwork(raw)) {
    return "testnet";
  }

  return raw;
}

export function getExplorerTxUrl(hash?: string | null): string | null {
  if (!hash || !hash.trim()) return null;

  const network = getClientNetwork();

  // stellar.expert uses 'public' for mainnet and 'testnet' for testnet
  const path = network === "mainnet" ? "public" : "testnet";

  return `https://stellar.expert/explorer/${path}/tx/${encodeURIComponent(hash)}`;
}

export default getExplorerTxUrl;
