import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { resolveAddressFromRequest } from './route';

function createRequest(method: string, url: string, body?: unknown): NextRequest {
  const request = new NextRequest(url, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
  });
  return request;
}

describe('resolveAddressFromRequest', () => {
  describe('success cases', () => {
    it('returns address from query params', async () => {
      const req = createRequest('GET', 'http://localhost/api/auth/nonce?address=GABC123');
      const result = await resolveAddressFromRequest(req);
      expect(result).toBe('GABC123');
    });

    it('returns address from POST body publicKey', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce', { publicKey: 'GDEF456' });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBe('GDEF456');
    });

    it('returns address from POST body address field', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce', { address: 'GHIJ789' });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBe('GHIJ789');
    });

    it('trims whitespace from query param address', async () => {
      const req = createRequest('GET', 'http://localhost/api/auth/nonce?address=%20%20GABC123%20%20');
      const result = await resolveAddressFromRequest(req);
      expect(result).toBe('GABC123');
    });

    it('trims whitespace from body address', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce', { address: '  GABC123  ' });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBe('GABC123');
    });

    it('query param takes precedence over body', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce?address=GQUERY123', { address: 'GBODY456' });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBe('GQUERY123');
    });
  });

  describe('failure cases', () => {
    it('returns null when no address provided', async () => {
      const req = createRequest('GET', 'http://localhost/api/auth/nonce');
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });

    it('returns null for empty query param', async () => {
      const req = createRequest('GET', 'http://localhost/api/auth/nonce?address=');
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });

    it('returns null for whitespace-only query param', async () => {
      const req = createRequest('GET', 'http://localhost/api/auth/nonce?address=%20%20');
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });

    it('returns null for malformed JSON body', async () => {
      const req = new NextRequest('http://localhost/api/auth/nonce', {
        method: 'POST',
        body: 'not valid json',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });

    it('returns null when body address is not a string', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce', { address: 12345 });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });

    it('returns null when body publicKey is not a string', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce', { publicKey: null });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });

    it('returns null for GET request with body', async () => {
      const req = createRequest('GET', 'http://localhost/api/auth/nonce', { address: 'GABC123' });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });

    it('returns null for empty POST body', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce', {});
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });
  });

  describe('boundary cases', () => {
    it('handles very long address strings', async () => {
      const longAddress = 'G' + 'A'.repeat(100);
      const req = createRequest('GET', `http://localhost/api/auth/nonce?address=${longAddress}`);
      const result = await resolveAddressFromRequest(req);
      expect(result).toBe(longAddress);
    });

    it('handles address with special characters in query param', async () => {
      const req = createRequest('GET', 'http://localhost/api/auth/nonce?address=GABC%2B123');
      const result = await resolveAddressFromRequest(req);
      expect(result).toBe('GABC+123');
    });

    it('handles POST with both publicKey and address (prefers publicKey)', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce', {
        publicKey: 'GPUBLIC123',
        address: 'GADDRESS456',
      });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBe('GPUBLIC123');
    });

    it('handles POST with null body', async () => {
      const req = new NextRequest('http://localhost/api/auth/nonce', {
        method: 'POST',
      });
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });

    it('handles POST with array body', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce', [1, 2, 3]);
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });

    it('handles POST with string body', async () => {
      const req = createRequest('POST', 'http://localhost/api/auth/nonce', 'just a string');
      const result = await resolveAddressFromRequest(req);
      expect(result).toBeNull();
    });
  });
});
