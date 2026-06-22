// Stellar network configuration
export const STELLAR_CONFIG = {
  network: process.env.STELLAR_NETWORK || 'testnet',
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  contractId: process.env.REMITTANCE_SPLIT_CONTRACT_ID || '',
  custodialMode: process.env.CUSTODIAL_MODE === 'true',
  serverSecretKey: process.env.SERVER_SECRET_KEY || '',
};

export const CONTRACTS = {
  remittanceSplit: {
    testnet: process.env.REMITTANCE_SPLIT_CONTRACT_ID || 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    mainnet: process.env.REMITTANCE_SPLIT_CONTRACT_ID || 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  }
};

/**
 * Returns the Stellar explorer segment ('testnet' | 'public') for the active network.
 * Uses NEXT_PUBLIC_STELLAR_NETWORK for client-side code, falls back to STELLAR_NETWORK
 * for server-side, defaulting to 'testnet'.
 */
export function getExplorerNetworkSegment(): 'testnet' | 'public' {
  const network =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK ||
    process.env.STELLAR_NETWORK ||
    'testnet';
  return network === 'mainnet' || network === 'public' ? 'public' : 'testnet';
}

/**
 * Returns a full Stellar Expert explorer URL for a transaction hash.
 */
export function getExplorerTxUrl(hash: string): string {
  const segment = getExplorerNetworkSegment();
  return `https://stellar.expert/explorer/${segment}/tx/${hash}`;
}
