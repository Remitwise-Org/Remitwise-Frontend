import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/remittance/history/export/route';
import { requireAuth } from '@/lib/session';
import { fetchTransactionHistory, type TransactionItem } from '@/lib/remittance/horizon';

vi.mock('@/lib/session', () => ({ requireAuth: vi.fn() }));
vi.mock('@/lib/remittance/horizon', () => ({ fetchTransactionHistory: vi.fn() }));

const walletAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const otherAddress = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

function transaction(id: string, overrides: Partial<TransactionItem> = {}): TransactionItem {
  return {
    id,
    hash: 'a'.repeat(64),
    amount: '12.3400000',
    currency: 'USDC',
    recipient: otherAddress,
    sender: walletAddress,
    date: '2026-11-20T12:00:00Z',
    status: 'completed',
    ...overrides,
  };
}

function request(query: string) {
  return new NextRequest('http://localhost/api/v1/remittance/history/export?' + query);
}

describe('GET /api/v1/remittance/history/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ address: walletAddress });
    vi.mocked(fetchTransactionHistory).mockResolvedValue({
      transactions: [transaction('tx-1')],
      nextCursor: undefined,
    });
  });

  it('requires an authenticated wallet session', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const response = await GET(request('format=csv'));
    expect(response.status).toBe(401);
    expect(fetchTransactionHistory).not.toHaveBeenCalled();
  });

  it('streams CSV with attachment and no-store headers', async () => {
    const response = await GET(request('format=csv&from=2026-11-01&to=2026-11-30'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('attachment; filename="remitwise-transactions_2026-11-01_to_2026-11-30_');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-export-truncated')).toBe('false');
    expect(await response.text()).toBe(
      'id,type,status,amount,currency,counterparty,date,fee\n' +
      "tx-1,payment,completed,'-12.3400000,USDC," + otherAddress + ',2026-11-20T12:00:00Z,'
    );
    expect(fetchTransactionHistory).toHaveBeenCalledWith(walletAddress, { limit: 200, cursor: undefined });
  });

  it('streams valid JSON for the authenticated wallet', async () => {
    const response = await GET(request('format=json'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('content-disposition')).toContain('.json"');

    const rows = await response.json();
    expect(rows).toEqual([{
      id: 'tx-1',
      type: 'payment',
      status: 'completed',
      amount: '-12.3400000',
      currency: 'USDC',
      counterparty: otherAddress,
      date: '2026-11-20T12:00:00Z',
      fee: '',
    }]);
  });

  it('filters transactions by inclusive UTC date range', async () => {
    vi.mocked(fetchTransactionHistory).mockResolvedValue({
      transactions: [
        transaction('end', { date: '2026-11-30T23:59:59Z' }),
        transaction('inside', { date: '2026-11-01T00:00:00Z' }),
        transaction('before', { date: '2026-10-31T23:59:59Z' }),
      ],
      nextCursor: undefined,
    });

    const response = await GET(request('format=json&from=2026-11-01&to=2026-11-30'));
    const rows = await response.json();
    expect(rows.map((row: { id: string }) => row.id)).toEqual(['end', 'inside']);
  });

  it('rejects unsupported formats and invalid date ranges', async () => {
    expect((await GET(request('format=xml'))).status).toBe(400);
    expect((await GET(request('format=csv&from=2026-02-30'))).status).toBe(400);
    expect((await GET(request('format=csv&from=2026-12-01&to=2026-11-01'))).status).toBe(400);
    expect(fetchTransactionHistory).not.toHaveBeenCalled();
  });

  it('caps paginated exports at 10,000 rows and marks the response as truncated', async () => {
    for (let page = 0; page < 50; page += 1) {
      vi.mocked(fetchTransactionHistory).mockResolvedValueOnce({
        transactions: Array.from({ length: 200 }, (_, index) =>
          transaction('tx-' + (page * 200 + index))
        ),
        nextCursor: 'cursor-' + page,
      });
    }
    vi.mocked(fetchTransactionHistory).mockResolvedValueOnce({
      transactions: [transaction('tx-10000')],
      nextCursor: 'cursor-50',
    });

    const response = await GET(request('format=json'));
    expect(response.headers.get('x-export-truncated')).toBe('true');
    const rows = await response.json();
    expect(rows).toHaveLength(10_000);
    expect(fetchTransactionHistory).toHaveBeenCalledTimes(51);
    expect(fetchTransactionHistory).toHaveBeenLastCalledWith(walletAddress, {
      limit: 200,
      cursor: 'cursor-49',
    });
  });

  it('paginates until the full history has been collected', async () => {
    vi.mocked(fetchTransactionHistory)
      .mockResolvedValueOnce({ transactions: [transaction('first')], nextCursor: 'cursor-1' })
      .mockResolvedValueOnce({ transactions: [transaction('second')], nextCursor: undefined });

    const response = await GET(request('format=json'));
    const rows = await response.json();
    expect(rows.map((row: { id: string }) => row.id)).toEqual(['first', 'second']);
    expect(fetchTransactionHistory).toHaveBeenNthCalledWith(2, walletAddress, {
      limit: 200,
      cursor: 'cursor-1',
    });
  });
});
