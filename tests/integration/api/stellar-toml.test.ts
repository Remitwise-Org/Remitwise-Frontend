import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/.well-known/stellar.toml/route';
import { getSorobanNetworkPassphrase } from '@/lib/contracts/network-resolution';
import { Networks } from '@stellar/stellar-sdk';

// A simple TOML parser helper for testing the route response
function parseToml(tomlStr: string): Record<string, any> {
  const result: Record<string, any> = {};
  let currentSection = result;

  const lines = tomlStr.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      const sectionName = line.slice(1, -1).trim();
      result[sectionName] = {};
      currentSection = result[sectionName];
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let value: any = line.slice(eqIdx + 1).trim();

      // Strip surrounding quotes for string values
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (!isNaN(Number(value))) {
        value = Number(value);
      }

      currentSection[key] = value;
    }
  }
  return result;
}

describe('Stellar TOML Integration Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env variables after each test
    process.env = originalEnv;
  });

  it('redirects to STELLAR_TOML_REDIRECT if configured', async () => {
    const redirectUrl = 'https://example.com/custom-stellar.toml';
    process.env.STELLAR_TOML_REDIRECT = redirectUrl;

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe(redirectUrl);
  });

  it('serves stellar.toml with correct CORS and Content-Type headers', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
  });

  it('parses as valid TOML and contains expected SEP-1 fields', async () => {
    process.env.STELLAR_SIGNING_KEY = 'GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3';
    process.env.STELLAR_TRANSFER_SERVER = 'https://api.remitwise.app/transfer';

    const response = await GET();
    const body = await response.text();
    const parsed = parseToml(body);

    expect(parsed.VERSION).toBe('2.0.0');
    expect(parsed.SIGNING_KEY).toBe(process.env.STELLAR_SIGNING_KEY);
    expect(parsed.TRANSFER_SERVER).toBe(process.env.STELLAR_TRANSFER_SERVER);

    // [DOCUMENTATION] table
    expect(parsed.DOCUMENTATION).toBeDefined();
    expect(parsed.DOCUMENTATION.ORG_NAME).toBe('RemitWise');
    expect(parsed.DOCUMENTATION.ORG_URL).toBe('https://remitwise.app');
    expect(parsed.DOCUMENTATION.ORG_DESCRIPTION).toBe('Stellar-based cross-border remittance platform');
    expect(parsed.DOCUMENTATION.DOCUMENTATION).toBe('https://remitwise.app/.well-known/stellar.toml');
  });

  it('resolves NETWORK_PASSPHRASE dynamically from network resolution utilities (testnet)', async () => {
    process.env.SOROBAN_NETWORK = 'testnet';
    
    // Explicitly delete custom passphrase to ensure it resolves via network-resolution.ts
    delete process.env.STELLAR_NETWORK_PASSPHRASE;

    const resolvedPassphrase = getSorobanNetworkPassphrase();
    expect(resolvedPassphrase).toBe(Networks.TESTNET);

    const response = await GET();
    const body = await response.text();
    const parsed = parseToml(body);

    expect(parsed.NETWORK_PASSPHRASE).toBe(Networks.TESTNET);
  });

  it('resolves NETWORK_PASSPHRASE dynamically from network resolution utilities (mainnet)', async () => {
    process.env.SOROBAN_NETWORK = 'mainnet';
    delete process.env.STELLAR_NETWORK_PASSPHRASE;

    const resolvedPassphrase = getSorobanNetworkPassphrase();
    expect(resolvedPassphrase).toBe(Networks.PUBLIC);

    const response = await GET();
    const body = await response.text();
    const parsed = parseToml(body);

    expect(parsed.NETWORK_PASSPHRASE).toBe(Networks.PUBLIC);
  });

  it('allows overriding NETWORK_PASSPHRASE via env variable', async () => {
    const customPassphrase = 'My Custom Stellar Network';
    process.env.STELLAR_NETWORK_PASSPHRASE = customPassphrase;

    const response = await GET();
    const body = await response.text();
    const parsed = parseToml(body);

    expect(parsed.NETWORK_PASSPHRASE).toBe(customPassphrase);
  });
});
