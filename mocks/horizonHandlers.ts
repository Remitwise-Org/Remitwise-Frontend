import { http, HttpResponse } from 'msw';

/**
 * MSW handlers for the on-chain read layer (`lib/remittance/horizon.ts`),
 * standing in for the real Stellar Horizon REST API. Response shapes match
 * Horizon's HAL envelope and the specific fields `mapPaymentToTx` /
 * `fetchTransactionReceipt` / `fetchTransactionStatus` read, so tests can
 * exercise the real fetch/parse code path instead of mocking `horizon.ts`'s
 * own exports.
 *
 * Import `HORIZON_TEST_*` fixtures from this module to assert against known
 * values instead of duplicating them in every consuming test.
 */

const HORIZON_BASE = 'https://horizon-testnet.stellar.org';

export const HORIZON_TEST_ACCOUNT = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRST234';
export const HORIZON_TEST_TX_HASH =
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
export const HORIZON_NOT_FOUND_TX_HASH = '0'.repeat(64);
export const HORIZON_UNFUNDED_ACCOUNT =
  'GUNFUNDEDACCOUNT23456789ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const HORIZON_OUTAGE_ACCOUNT =
  'GOUTAGEACCOUNT23456789ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const paymentRecord = {
  id: 'op_1',
  paging_token: 'op_1',
  transaction_hash: HORIZON_TEST_TX_HASH,
  transaction_successful: true,
  type: 'payment',
  created_at: '2026-07-01T00:00:00Z',
  asset_type: 'native',
  from: HORIZON_TEST_ACCOUNT,
  to: 'GZYX9876543210ZYXWVUTSRQPONMLKJIHGFEDCBA98765432ABCDEF',
  amount: '25.0000000',
};

const secondPaymentRecord = {
  ...paymentRecord,
  id: 'op_2',
  paging_token: 'op_2',
  transaction_hash: 'b'.repeat(64),
  amount: '10.0000000',
};

export const horizonHandlers = [
  http.get(`${HORIZON_BASE}/accounts/:address/payments`, ({ params, request }) => {
    const address = params.address;
    if (address === HORIZON_UNFUNDED_ACCOUNT) {
      return HttpResponse.json({ status: 404, title: 'Resource Missing' }, { status: 404 });
    }
    if (address === HORIZON_OUTAGE_ACCOUNT) {
      return HttpResponse.json({ status: 503, title: 'Service Unavailable' }, { status: 503 });
    }

    const cursor = new URL(request.url).searchParams.get('cursor');
    const limit = new URL(request.url).searchParams.get('limit');
    if (cursor === 'op_1') {
      return HttpResponse.json({
        _embedded: { records: [secondPaymentRecord] },
      });
    }

    if (limit === '1') {
      return HttpResponse.json({
        _embedded: { records: [paymentRecord] },
      });
    }

    return HttpResponse.json({
      _embedded: { records: [paymentRecord] },
    });
  }),

  http.get(`${HORIZON_BASE}/transactions/:hash`, ({ params }) => {
    if (params.hash === HORIZON_NOT_FOUND_TX_HASH) {
      return HttpResponse.json({ status: 404, title: 'Resource Missing' }, { status: 404 });
    }
    return HttpResponse.json({
      hash: params.hash,
      successful: true,
      source_account: HORIZON_TEST_ACCOUNT,
      created_at: '2026-07-01T00:00:00Z',
      fee_charged: '100',
      memo_type: 'text',
      memo: 'invoice-42',
    });
  }),

  http.get(`${HORIZON_BASE}/transactions/:hash/operations`, () => {
    return HttpResponse.json({
      _embedded: { records: [paymentRecord] },
    });
  }),
];
