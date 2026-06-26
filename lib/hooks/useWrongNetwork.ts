"use client";

import { useWallet } from "stellar-wallet-kit";

/** Expected network derived from build-time env. Defaults to "testnet". */
const EXPECTED_NETWORK =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet").toLowerCase();

export interface WrongNetworkState {
  /** True when the wallet is connected and on the wrong network. */
  isWrongNetwork: boolean;
  /** The network the app expects ("testnet" | "mainnet"). */
  expectedNetwork: string;
  /** The network the wallet is currently on, or null when not connected. */
  activeNetwork: string | null;
}

/**
 * Returns whether the connected wallet is on the wrong Stellar network.
 *
 * Usage:
 *   const { isWrongNetwork, expectedNetwork } = useWrongNetwork();
 */
export function useWrongNetwork(): WrongNetworkState {
  const { isConnected, network } = useWallet();

  const activeNetwork = network ? network.toLowerCase() : null;
  const isWrongNetwork =
    isConnected && activeNetwork !== null && activeNetwork !== EXPECTED_NETWORK;

  return { isWrongNetwork, expectedNetwork: EXPECTED_NETWORK, activeNetwork };
}
