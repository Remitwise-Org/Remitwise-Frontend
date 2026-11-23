import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/swap/quote/route';
import { getSession } from '@/lib/session';
import {
  findBestSwapPath,
  SwapQuoteError,
} from '@/lib/swap/quote';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/swap/quote', () => {
  class MockSwapQuoteError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  }
  return {
    findBestSwapPath: vi.fn(),
    SwapQuoteError: MockSwapQuoteError,
  };
});

describe('GET /api/swap/quote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires an authenticated wallet session', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const response = await GET(new NextRequest('http://localhost/api/swap/quote?amount=1'));
    expect(response.status).toBe(401);
  });

  it('returns the Horizon quote for an authenticated wallet', async () => {
    vi.mocked(getSession).mockResolvedValue({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    });
    vi.mocked(findBestSwapPath).mockResolvedValue({
      record: {} as never,
      quote: {
        sourceAsset: { code: 'XLM' },
        destinationAsset: { code: 'USDC', issuer: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' },
        sourceAmount: '1',
        destinationAmount: '2',
        exchangeRate: '2',
        path: [],
      },
    });

    const response = await GET(new NextRequest(
      'http://localhost/api/swap/quote?sourceCode=XLM&destinationCode=USDC&destinationIssuer=GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF&amount=1'
    ));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      quote: { sourceAmount: '1', destinationAmount: '2' },
    });
  });

  it('returns the no-path status from the quote service', async () => {
    vi.mocked(getSession).mockResolvedValue({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    });
    vi.mocked(findBestSwapPath).mockRejectedValue(new SwapQuoteError('No path', 404));

    const response = await GET(new NextRequest('http://localhost/api/swap/quote?amount=1'));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: 'No path' });
  });
});
