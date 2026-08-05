/**
 * Wallet address display helpers.
 *
 * Truncation rule (design/wallet-dropdown-states.md):
 * keep the first 6 characters and last 4 characters, separated by an ellipsis.
 * Example: GABCDE...7890
 *
 * Copy always uses the full address string — never the truncated form.
 */

export function truncateAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export type WalletNetworkKind = 'mainnet' | 'testnet' | 'unknown';

export function resolveNetworkKind(network?: string | null): WalletNetworkKind {
  const normalized = (network ?? '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized === 'mainnet' || normalized === 'public' || normalized === 'pubnet') {
    return 'mainnet';
  }
  if (normalized === 'testnet' || normalized === 'test' || normalized.includes('test')) {
    return 'testnet';
  }
  return 'unknown';
}

/** 8px network status colors per design redline. */
export function networkDotClass(network?: string | null): string {
  switch (resolveNetworkKind(network)) {
    case 'mainnet':
      return 'bg-emerald-400';
    case 'testnet':
      return 'bg-amber-400';
    default:
      return 'bg-gray-400';
  }
}

export function getExplorerAccountUrl(
  address: string,
  network?: string | null,
): string | null {
  if (!address?.trim()) return null;
  const kind = resolveNetworkKind(network);
  const path = kind === 'mainnet' ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${path}/account/${encodeURIComponent(address)}`;
}
