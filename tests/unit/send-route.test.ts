import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Account, Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

const authState = vi.hoisted(() => ({ address: '' }));

vi.mock('@/lib/auth', () => ({
  withAuth:
    (handler: (req: NextRequest, address: string) => Promise<Response>) =>
    (req: NextRequest) =>
      handler(req, authState.address),
}));
vi.mock('@/lib/remittance/horizon', () => ({
  getHorizonServer: vi.fn(),
}));

import { POST } from '@/app/api/send/route';
import { getHorizonServer } from '@/lib/remittance/horizon';

const SOURCE = Keypair.random().publicKey();
const VALID_RECIPIENT = Keypair.random().publicKey();
const fundedAccount = (address: string) => new Account(address, '1');
const loadAccount = vi.fn();

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.address = SOURCE;
    loadAccount.mockImplementation((address: string) =>
      Promise.resolve(fundedAccount(address)),
    );
    vi.mocked(getHorizonServer).mockReturnValue({ loadAccount } as never);
  });

  it('returns a decodable unsigned Stellar payment XDR', async () => {
    const res = await POST(
      makePostRequest({
        recipient: VALID_RECIPIENT,
        amount: 100,
        currency: 'USDC',
        memo: 'invoice-42',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      networkPassphrase: expect.any(String),
      fee: expect.any(String),
    });

    const transaction = TransactionBuilder.fromXDR(
      body.xdr,
      body.networkPassphrase,
    );
    if (!('operations' in transaction)) {
      throw new Error('Expected a standard Stellar transaction.');
    }
    expect(transaction.signatures).toHaveLength(0);
    expect(transaction.operations).toHaveLength(1);
    expect(transaction.operations[0]).toMatchObject({
      type: 'payment',
      destination: VALID_RECIPIENT,
      amount: '100.0000000',
      asset: { code: 'USDC' },
    });
    const memo = transaction.memo.value;
    if (memo === null) throw new Error('Expected the transaction memo to be set.');
    expect(memo.toString()).toBe('invoice-42');
    expect(loadAccount).toHaveBeenCalledWith(SOURCE);
    expect(loadAccount).toHaveBeenCalledWith(VALID_RECIPIENT);
  });

  it('rejects an invalid destination before querying Horizon', async () => {
    const res = await POST(
      makePostRequest({ recipient: 'not-an-address', amount: 1, currency: 'XLM' }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/valid Stellar public key/);
    expect(loadAccount).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.12345678, Number.POSITIVE_INFINITY])(
    'rejects invalid amount %s',
    async (amount) => {
      const res = await POST(
        makePostRequest({ recipient: VALID_RECIPIENT, amount, currency: 'XLM' }),
      );
      expect(res.status).toBe(400);
      expect((await res.json()).success).toBe(false);
    },
  );

  it('rejects unsupported assets', async () => {
    const res = await POST(
      makePostRequest({ recipient: VALID_RECIPIENT, amount: 1, currency: 'EUR' }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/currency must be either XLM or USDC/);
  });

  it('rejects memos longer than the Stellar 28-byte limit', async () => {
    const res = await POST(
      makePostRequest({
        recipient: VALID_RECIPIENT,
        amount: 1,
        currency: 'XLM',
        memo: 'é'.repeat(15),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/28 bytes or less/);
  });

  it('returns 422 when Horizon reports an unknown or unfunded account', async () => {
    loadAccount.mockRejectedValueOnce({
      response: { status: 404 },
    });
    const res = await POST(
      makePostRequest({ recipient: VALID_RECIPIENT, amount: 1, currency: 'XLM' }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/not funded/);
  });

  it('still requires a non-empty recipient', async () => {
    const res = await POST(
      makePostRequest({ recipient: '', amount: 1, currency: 'USDC' }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('recipient is required.');
  });
});
