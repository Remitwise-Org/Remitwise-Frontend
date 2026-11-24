import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { horizonServer } from '../../mocks/horizonServer';
import {
  HORIZON_OUTAGE_ACCOUNT,
  HORIZON_TEST_ACCOUNT,
  HORIZON_UNFUNDED_ACCOUNT,
} from '../../mocks/horizonHandlers';

vi.mock('@/lib/session', () => ({
  requireAuth: vi.fn(() =>
    Promise.resolve({ address: HORIZON_TEST_ACCOUNT })
  ),
}));

import { requireAuth } from '@/lib/session';
import { GET } from '@/app/api/v1/remittance/history/route';

beforeAll(() => horizonServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  horizonServer.resetHandlers();
  vi.mocked(requireAuth).mockResolvedValue({ address: HORIZON_TEST_ACCOUNT });
});
afterAll(() => horizonServer.close());

describe('GET /api/v1/remittance/history', () => {
  it('returns the first Horizon page scoped to the session address', async () => {
    const response = await GET(new Request(
      'http://localhost/api/v1/remittance/history?limit=1',
    ) as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0].sender).toBe(HORIZON_TEST_ACCOUNT);
    expect(body.nextCursor).toBe('op_1');
    expect(body.hasMore).toBe(true);
    expect(body.userAddress).toBe(HORIZON_TEST_ACCOUNT);
  });

  it('round-trips the opaque paging cursor to the next page', async () => {
    const first = await GET(new Request(
      'http://localhost/api/v1/remittance/history?limit=1',
    ) as any);
    const firstBody = await first.json();

    const second = await GET(new Request(
      `http://localhost/api/v1/remittance/history?limit=1&cursor=${firstBody.nextCursor}`,
    ) as any);
    const secondBody = await second.json();

    expect(secondBody.transactions[0].id).toBe('op_2');
    expect(secondBody.nextCursor).toBe('op_2');
  });

  it('returns an empty page for an unfunded session account', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ address: HORIZON_UNFUNDED_ACCOUNT });

    const response = await GET(new Request(
      'http://localhost/api/v1/remittance/history',
    ) as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      transactions: [],
      hasMore: false,
      userAddress: HORIZON_UNFUNDED_ACCOUNT,
    });
  });

  it('returns 502 when Horizon is unavailable', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ address: HORIZON_OUTAGE_ACCOUNT });

    const response = await GET(new Request(
      'http://localhost/api/v1/remittance/history',
    ) as any);

    expect(response.status).toBe(502);
  });

  it('does not accept an address query parameter', async () => {
    const response = await GET(new Request(
      `http://localhost/api/v1/remittance/history?address=${HORIZON_UNFUNDED_ACCOUNT}`,
    ) as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.userAddress).toBe(HORIZON_TEST_ACCOUNT);
  });
});
