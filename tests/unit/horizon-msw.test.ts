/**
 * Exercises `lib/remittance/horizon.ts`'s on-chain read functions against
 * the MSW-mocked Horizon REST API (`mocks/horizonHandlers.ts`), instead of
 * mocking `horizon.ts`'s own exports -- this covers the real HTTP
 * request/response parsing (HAL envelope, field mapping), not just the
 * function signatures.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { horizonServer } from '../../mocks/horizonServer';
import {
  HORIZON_NOT_FOUND_TX_HASH,
  HORIZON_TEST_ACCOUNT,
  HORIZON_TEST_TX_HASH,
} from '../../mocks/horizonHandlers';
import {
  fetchTransactionHistory,
  fetchTransactionReceipt,
  fetchTransactionStatus,
} from '../../lib/remittance/horizon';

beforeAll(() => horizonServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => horizonServer.resetHandlers());
afterAll(() => horizonServer.close());

describe('horizon.ts against MSW-mocked Horizon', () => {
  it('fetchTransactionHistory maps the mocked payment record', async () => {
    const { transactions } = await fetchTransactionHistory(HORIZON_TEST_ACCOUNT);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      hash: HORIZON_TEST_TX_HASH,
      currency: 'XLM',
      amount: '25.0000000',
      status: 'completed',
    });
  });

  it('fetchTransactionReceipt assembles receipt data from the mocked transaction + operations', async () => {
    const receipt = await fetchTransactionReceipt(HORIZON_TEST_TX_HASH);

    expect(receipt).toMatchObject({
      hash: HORIZON_TEST_TX_HASH,
      status: 'completed',
      currency: 'XLM',
      amount: '25.0000000',
      memo: 'invoice-42',
      fee: '0.0000100',
    });
  });

  it('fetchTransactionReceipt returns null for a 404 from Horizon', async () => {
    const receipt = await fetchTransactionReceipt(HORIZON_NOT_FOUND_TX_HASH);
    expect(receipt).toBeNull();
  });

  it('fetchTransactionStatus returns "completed" for the mocked successful transaction', async () => {
    const status = await fetchTransactionStatus(HORIZON_TEST_TX_HASH);
    expect(status).toBe('completed');
  });

  it('fetchTransactionStatus returns "not_found" for a 404 from Horizon', async () => {
    const status = await fetchTransactionStatus(HORIZON_NOT_FOUND_TX_HASH);
    expect(status).toBe('not_found');
  });
});
