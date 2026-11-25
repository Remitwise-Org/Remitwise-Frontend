import { Asset, StrKey } from '@stellar/stellar-sdk';
import { getHorizonServer } from '@/lib/remittance/horizon';
import { hasAtMostDecimals } from '@/lib/utils/decimal-places';

export interface SwapAssetInput {
  code: string;
  issuer?: string;
}

export interface SwapQuoteInput {
  sourceAsset: SwapAssetInput;
  destinationAsset: SwapAssetInput;
  amount: string;
}

export interface SwapQuote {
  sourceAsset: SwapAssetInput;
  destinationAsset: SwapAssetInput;
  sourceAmount: string;
  destinationAmount: string;
  exchangeRate: string;
  path: Array<{ code: string; issuer?: string }>;
}

export class SwapQuoteError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'SwapQuoteError';
  }
}

const AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/;
const STROOP_SCALE = 10_000_000n;
const MAX_AMOUNT_UNITS = 9_223_372_036_854_775_807n;
const RATE_SCALE = 100_000_000n;

function toStroops(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * STROOP_SCALE + BigInt(fraction.padEnd(7, '0'));
}

function formatExchangeRate(sourceAmount: string, destinationAmount: string): string {
  const rateUnits = (toStroops(destinationAmount) * RATE_SCALE) / toStroops(sourceAmount);
  const whole = rateUnits / RATE_SCALE;
  const fraction = (rateUnits % RATE_SCALE).toString().padStart(8, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function parseSwapAsset(input: SwapAssetInput): Asset {
  if (!input || typeof input.code !== 'string') {
    throw new SwapQuoteError('A valid asset is required.');
  }

  const code = input.code.trim();
  if (code.toUpperCase() === 'XLM') {
    if (input.issuer) throw new SwapQuoteError('Native XLM must not include an issuer.');
    return Asset.native();
  }

  if (!/^[a-zA-Z0-9]{1,12}$/.test(code)) {
    throw new SwapQuoteError('Asset code must contain 1–12 letters or numbers.');
  }
  if (typeof input.issuer !== 'string' || !StrKey.isValidEd25519PublicKey(input.issuer)) {
    throw new SwapQuoteError('A valid Stellar issuer public key is required for issued assets.');
  }

  return new Asset(code, input.issuer);
}

export function validateSwapAmount(value: unknown): string {
  if (typeof value !== 'string' || !AMOUNT_PATTERN.test(value) || !hasAtMostDecimals(value, 7)) {
    throw new SwapQuoteError('Amount must be a positive decimal with at most 7 decimal places.');
  }

  const units = toStroops(value);
  if (units <= 0n || units > MAX_AMOUNT_UNITS) {
    throw new SwapQuoteError('Amount is outside the supported Stellar range.');
  }
  return value;
}

export function validateSlippage(value: unknown): number {
  const slippage = value === undefined ? 1 : typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(slippage) || slippage < 0 || slippage > 5) {
    throw new SwapQuoteError('Slippage must be between 0 and 5 percent.');
  }
  return slippage;
}

export function calculateMinimumReceived(amount: string, slippagePercent: number): string {
  const units = toStroops(amount);
  const retainedBasisPoints = BigInt(Math.round((100 - slippagePercent) * 100));
  const minimumUnits = (units * retainedBasisPoints) / 10_000n;
  const integer = minimumUnits / STROOP_SCALE;
  const rawDecimals = (minimumUnits % STROOP_SCALE).toString().padStart(7, '0');
  const decimals = rawDecimals.replace(/0+$/, '');
  return decimals ? `${integer}.${decimals}` : integer.toString();
}

function assetFromPathRecord(asset: { asset_type: string; asset_code?: string; asset_issuer?: string }) {
  return asset.asset_type === 'native'
    ? { code: 'XLM' }
    : { code: asset.asset_code ?? '', issuer: asset.asset_issuer };
}

export async function findBestSwapPath(input: SwapQuoteInput) {
  const amount = validateSwapAmount(input.amount);
  const sourceAsset = parseSwapAsset(input.sourceAsset);
  const destinationAsset = parseSwapAsset(input.destinationAsset);

  if (
    sourceAsset.isNative() === destinationAsset.isNative() &&
    sourceAsset.code === destinationAsset.code &&
    sourceAsset.issuer === destinationAsset.issuer
  ) {
    throw new SwapQuoteError('Source and destination assets must be different.');
  }

  const response = await getHorizonServer()
    .strictSendPaths(sourceAsset, amount, [destinationAsset])
    .call();

  const bestPath = response.records.reduce((best, candidate) =>
    !best || toStroops(candidate.destination_amount) > toStroops(best.destination_amount)
      ? candidate
      : best,
  undefined as (typeof response.records)[number] | undefined);
  if (!bestPath) {
    throw new SwapQuoteError('No payment path is currently available for this asset pair.', 404);
  }

  return {
    record: bestPath,
    quote: {
      sourceAsset: input.sourceAsset,
      destinationAsset: input.destinationAsset,
      sourceAmount: bestPath.source_amount,
      destinationAmount: bestPath.destination_amount,
      exchangeRate: formatExchangeRate(bestPath.source_amount, bestPath.destination_amount),
      path: bestPath.path.map(assetFromPathRecord),
    } satisfies SwapQuote,
  };
}
