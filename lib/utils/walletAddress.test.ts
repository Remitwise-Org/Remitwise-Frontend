import { describe, expect, it } from 'vitest';
import {
  getExplorerAccountUrl,
  resolveNetworkKind,
  truncateAddress,
} from './walletAddress';

describe('truncateAddress', () => {
  it('returns empty string for empty input', () => {
    expect(truncateAddress('')).toBe('');
  });

  it('keeps short addresses intact', () => {
    expect(truncateAddress('GSHORT')).toBe('GSHORT');
  });

  it('uses 6…4 truncation', () => {
    expect(
      truncateAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF'),
    ).toBe('GABCDE...CDEF');
  });
});

describe('resolveNetworkKind', () => {
  it('maps common network labels', () => {
    expect(resolveNetworkKind('mainnet')).toBe('mainnet');
    expect(resolveNetworkKind('Public')).toBe('mainnet');
    expect(resolveNetworkKind('Testnet')).toBe('testnet');
    expect(resolveNetworkKind('unknown-net')).toBe('unknown');
  });
});

describe('getExplorerAccountUrl', () => {
  it('returns null without an address', () => {
    expect(getExplorerAccountUrl('')).toBeNull();
  });

  it('builds stellar.expert account URLs', () => {
    expect(getExplorerAccountUrl('GABC', 'testnet')).toBe(
      'https://stellar.expert/explorer/testnet/account/GABC',
    );
    expect(getExplorerAccountUrl('GABC', 'mainnet')).toBe(
      'https://stellar.expert/explorer/public/account/GABC',
    );
  });
});
