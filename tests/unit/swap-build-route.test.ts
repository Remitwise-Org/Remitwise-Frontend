import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Account, TransactionBuilder } from '@stellar/stellar-sdk';
import { POST } from '@/app/api/swap/build/route';
import { STELLAR_CONFIG } from '@/lib/config/stellar';
import { getHorizonServer } from '@/lib/remittance/horizon';
import { getSession } from '@/lib/session';
import { findBestSwapPath } from '@/lib/swap/quote';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/remittance/horizon', () => ({ getHorizonServer: vi.fn() }));
vi.mock('@/lib/swap/quote', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/swap/quote')>();
  return { ...actual, findBestSwapPath: vi.fn() };
});

const walletAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const issuer = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('POST /api/swap/build', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({
      address: walletAddress,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    });
    vi.mocked(getHorizonServer).mockReturnValue({
      loadAccount: vi.fn().mockResolvedValue(new Account(walletAddress, '1')),
    } as never);
    vi.mocked(findBestSwapPath).mockResolvedValue({
      record: { source_amount: '1', destination_amount: '2', path: [] } as never,
      quote: {
        sourceAsset: { code: 'XLM' },
        destinationAsset: { code: 'USDC', issuer },
        sourceAmount: '1',
        destinationAmount: '2',
        exchangeRate: '2',
        path: [],
      },
    });
  });

  it('returns decodable unsigned strict-send XDR with the slippage destMin', async () => {
    const request = new NextRequest('http://localhost/api/swap/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAsset: { code: 'XLM' },
        destinationAsset: { code: 'USDC', issuer },
        amount: '1',
        slippage: 1,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.minimumReceived).toBe('1.98');

    const decoded = TransactionBuilder.fromXDR(data.xdr, STELLAR_CONFIG.networkPassphrase);
    expect(decoded.operations).toHaveLength(1);
    expect(decoded.operations[0].type).toBe('pathPaymentStrictSend');
    expect(decoded.operations[0].destMin).toBe('1.98');
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const request = new NextRequest('http://localhost/api/swap/build', {
      method: 'POST',
      body: JSON.stringify({ amount: '1' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('rejects slippage above five percent', async () => {
    const request = new NextRequest('http://localhost/api/swap/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAsset: { code: 'XLM' },
        destinationAsset: { code: 'USDC', issuer },
        amount: '1',
        slippage: 5.1,
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(findBestSwapPath).not.toHaveBeenCalled();
  });

  it('rejects an invalid destination issuer', async () => {
    const request = new NextRequest('http://localhost/api/swap/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAsset: { code: 'XLM' },
        destinationAsset: { code: 'USDC', issuer: 'not-a-stellar-key' },
        amount: '1',
        slippage: 1,
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('rejects malformed JSON', async () => {
    const request = new NextRequest('http://localhost/api/swap/build', {
      method: 'POST',
      body: '{invalid',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
