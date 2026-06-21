import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/.well-known/stellar.toml/route';
import { getSorobanNetworkPassphrase } from '@/lib/contracts/network-resolution';

// Simple parser for our produced TOML format
function parseTOML(text: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        const arrayContent = value.slice(1, -1);
        result[key] = arrayContent
          .split(',')
          .map(item => item.trim().replace(/^"|"$/g, ''))
          .filter(Boolean);
      } else {
        result[key] = value.replace(/^"|"$/g, '');
      }
    }
  }
  return result;
}

describe('Stellar TOML Route Integration Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    // Clear specifically monitored variables
    delete process.env.STELLAR_TOML_REDIRECT;
    delete process.env.STELLAR_DOCUMENTATION_URL;
    delete process.env.STELLAR_SIGNING_KEY;
    delete process.env.STELLAR_TRANSFER_SERVER;
    delete process.env.STELLAR_WEB_AUTH_ENDPOINT;
    delete process.env.STELLAR_KYC_SERVER;
    delete process.env.STELLAR_NETWORK_PASSPHRASE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should redirect if STELLAR_TOML_REDIRECT is set', async () => {
    process.env.STELLAR_TOML_REDIRECT = 'https://external-host.com/stellar.toml';
    
    const response = await GET();
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://external-host.com/stellar.toml');
  });

  it('should return 200 with text/plain content type on successful GET', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');

    const bodyText = await response.text();
    expect(bodyText).toBeTruthy();

    const parsed = parseTOML(bodyText);
    expect(parsed.VERSION).toBe('2.0.0');
    expect(parsed.ORG_NAME).toBe('RemitWise');
  });

  it('should dynamically match the network passphrase from network-resolution', async () => {
    // Case 1: Default (Testnet fallback)
    process.env.SOROBAN_NETWORK = 'testnet';
    const resTestnet = await GET();
    const parsedTestnet = parseTOML(await resTestnet.text());
    expect(parsedTestnet.NETWORK_PASSPHRASE).toBe(getSorobanNetworkPassphrase());
    expect(parsedTestnet.NETWORK_PASSPHRASE).toBe('Test SDF Network ; September 2015');

    // Case 2: Mainnet resolution
    process.env.SOROBAN_NETWORK = 'mainnet';
    const resMainnet = await GET();
    const parsedMainnet = parseTOML(await resMainnet.text());
    expect(parsedMainnet.NETWORK_PASSPHRASE).toBe(getSorobanNetworkPassphrase());
    expect(parsedMainnet.NETWORK_PASSPHRASE).toBe('Public Global Stellar Network ; September 2015');
  });

  it('should respect STELLAR_NETWORK_PASSPHRASE override if set', async () => {
    process.env.STELLAR_NETWORK_PASSPHRASE = 'Custom Passphrase';
    const response = await GET();
    const parsed = parseTOML(await response.text());
    expect(parsed.NETWORK_PASSPHRASE).toBe('Custom Passphrase');
  });

  it('should include required SEP-1 ACCOUNTS field if valid signing key is configured', async () => {
    const testKey = 'GBKX7K254X4X4X4X4X4X4X4X4X4X4X4X4X4X4X4X4X4X4X4X4X4X4X4X';
    process.env.STELLAR_SIGNING_KEY = testKey;
    
    const response = await GET();
    const parsed = parseTOML(await response.text());
    
    expect(parsed.SIGNING_KEY).toBe(testKey);
    expect(parsed.ACCOUNTS).toBeDefined();
    expect(parsed.ACCOUNTS).toContain(testKey);
  });

  it('should omit ACCOUNTS if signing key is the default placeholder', async () => {
    const response = await GET();
    const parsed = parseTOML(await response.text());
    
    expect(parsed.SIGNING_KEY).toBe('REPLACE_WITH_PROJECT_PUBLIC_KEY');
    expect(parsed.ACCOUNTS).toBeUndefined();
  });

  it('should conditionally include servers (Transfer, Web Auth, KYC) when configured', async () => {
    process.env.STELLAR_TRANSFER_SERVER = 'https://transfer.remitwise.app';
    process.env.STELLAR_WEB_AUTH_ENDPOINT = 'https://auth.remitwise.app';
    process.env.STELLAR_KYC_SERVER = 'https://kyc.remitwise.app';

    const response = await GET();
    const parsed = parseTOML(await response.text());

    expect(parsed.TRANSFER_SERVER).toBe('https://transfer.remitwise.app');
    expect(parsed.WEB_AUTH_ENDPOINT).toBe('https://auth.remitwise.app');
    expect(parsed.KYC_SERVER).toBe('https://kyc.remitwise.app');
  });
});
