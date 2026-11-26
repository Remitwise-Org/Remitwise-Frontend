import {
  Account,
  Asset,
  BASE_FEE,
  Memo,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { getSorobanNetworkPassphrase } from '@/lib/contracts/network-resolution';
import { getHorizonServer } from '@/lib/remittance/horizon';

export interface UnsignedPayment {
  xdr: string;
  networkPassphrase: string;
  /** Transaction fee in stroops. */
  fee: string;
}

export class BuildPaymentError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'BuildPaymentError';
  }
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const horizonError = error as {
    status?: number;
    response?: { status?: number };
  };
  return horizonError.response?.status === 404 || horizonError.status === 404;
}

export async function buildPayment(input: {
  sourceAddress: string;
  recipient: string;
  amount: number;
  currency: 'XLM' | 'USDC';
  memo?: string;
}): Promise<UnsignedPayment> {
  const server = getHorizonServer();
  let sourceAccount: Account;

  try {
    [sourceAccount] = await Promise.all([
      server.loadAccount(input.sourceAddress),
      server.loadAccount(input.recipient),
    ]);
  } catch (error) {
    if (isNotFound(error)) {
      throw new BuildPaymentError(
        'The source or destination account is not funded on the Stellar network.',
        422,
      );
    }
    throw error;
  }

  const asset =
    input.currency === 'XLM'
      ? Asset.native()
      : new Asset(
          'USDC',
          process.env.USDC_ISSUER_ADDRESS ??
            'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        );
  const networkPassphrase = getSorobanNetworkPassphrase();
  const builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  }).addOperation(
    Operation.payment({
      destination: input.recipient,
      asset,
      amount: input.amount.toFixed(7),
    }),
  );

  if (input.memo) {
    builder.addMemo(Memo.text(input.memo));
  }

  const transaction = builder.setTimeout(300).build();
  return {
    xdr: transaction.toXDR(),
    networkPassphrase,
    fee: BASE_FEE,
  };
}
