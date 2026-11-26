import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { POST } from '@/app/api/auth/verify/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn().mockResolvedValue({ stellar_address: 'mock' }),
    },
  },
}));

const mockCache = new Map<string, string>();
vi.mock('@/lib/auth-cache', () => ({
  getAndClearNonce: vi.fn((address: string) => {
    const nonce = mockCache.get(address) || null;
    mockCache.delete(address);
    return nonce;
  }),
}));

vi.mock('@/lib/session', () => ({
  createSession: vi.fn().mockResolvedValue({
    sealed: 'sealed-session-cookie',
    session: { publicKey: 'mock', expiresAt: Date.now() + 10000 },
  }),
  getSessionCookieHeader: vi.fn().mockReturnValue('stellar_session=sealed-session-cookie'),
}));

describe('POST /api/auth/verify', () => {
  const kp = Keypair.random();
  const address = kp.publicKey();
  const nonce = 'random-auth-nonce-123';

  beforeEach(() => {
    mockCache.clear();
    vi.clearAllMocks();
  });

  it('should return 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, nonce }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid Stellar address format', async () => {
    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address: 'INVALID_ADDRESS', nonce, signature: 'abc' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 401 when nonce is expired or missing', async () => {
    const signature = Buffer.from(kp.sign(Buffer.from(nonce, 'utf8'))).toString('base64');
    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, nonce, signature }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 401 when nonce is replayed', async () => {
    mockCache.set(address, nonce);
    const signature = Buffer.from(kp.sign(Buffer.from(nonce, 'utf8'))).toString('base64');
    
    const req1 = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, nonce, signature }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);

    // Replay with same nonce (already cleared)
    const req2 = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, nonce, signature }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(401);
  });

  it('should return 401 when signature is invalid', async () => {
    mockCache.set(address, nonce);
    const otherKp = Keypair.random();
    const badSignature = Buffer.from(otherKp.sign(Buffer.from(nonce, 'utf8'))).toString('base64');

    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, nonce, signature: badSignature }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should successfully verify signature and set session cookie', async () => {
    mockCache.set(address, nonce);
    const signature = Buffer.from(kp.sign(Buffer.from(nonce, 'utf8'))).toString('base64');

    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, nonce, signature }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.address).toBe(address);
    expect(res.headers.get('Set-Cookie')).toContain('stellar_session=');
  });
});
