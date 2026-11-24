import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHorizonServer } from '@/lib/remittance/horizon';
import {
  calculateMinimumReceived,
  findBestSwapPath,
  parseSwapAsset,
  SwapQuoteError,
  validateSlippage,
  validateSwapAmount,
} from './quote';

vi.mock('@/lib/remittance/horizon', () => ({
  getHorizonServer: vi.fn(),
}));

const issuer = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('Stellar swap quote validation', () => {
  it('accepts native XLM without an issuer', () => {
    expect(parseSwapAsset({ code: 'XLM' }).isNative()).toBe(true);
  });

  it('rejects issued assets without a valid issuer', () => {
    expect(() => parseSwapAsset({ code: 'USDC', issuer: 'not-a-key' })).toThrow(SwapQuoteError);
  });

  it('rejects malformed asset codes', () => {
    expect(() => parseSwapAsset({ code: 'THISASSETCODEISTOOLONG', issuer })).toThrow(SwapQuoteError);
  });

  it('validates positive amounts with at most seven decimal places', () => {
    expect(validateSwapAmount('12.1234567')).toBe('12.1234567');
    expect(() => validateSwapAmount('0')).toThrow(SwapQuoteError);
    expect(() => validateSwapAmount('1.12345678')).toThrow(SwapQuoteError);
    expect(() => validateSwapAmount('1e-7')).toThrow(SwapQuoteError);
  });

  it('enforces the 0–5 percent slippage range', () => {
    expect(validateSlippage(undefined)).toBe(1);
    expect(validateSlippage(5)).toBe(5);
    expect(() => validateSlippage(-0.1)).toThrow(SwapQuoteError);
    expect(() => validateSlippage(5.01)).toThrow(SwapQuoteError);
  });

  it('rounds the minimum received amount down to stroop precision', () => {
    expect(calculateMinimumReceived('10', 1)).toBe('9.9');
    expect(calculateMinimumReceived('1.0000001', 5)).toBe('0.95');
  });
});

describe('findBestSwapPath', () => {
  const call = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    call.mockResolvedValue({
      records: [
        { source_amount: '10', destination_amount: '23.9', path: [] },
        { source_amount: '10', destination_amount: '24.5', path: [] },
      ],
    });
    vi.mocked(getHorizonServer).mockReturnValue({
      strictSendPaths: vi.fn().mockReturnValue({ call }),
    } as never);
  });

  it('returns the best Horizon strict-send path and quote', async () => {
    const result = await findBestSwapPath({
      sourceAsset: { code: 'XLM' },
      destinationAsset: { code: 'USDC', issuer },
      amount: '10',
    });

    expect(result.quote.sourceAmount).toBe('10');
    expect(result.quote.destinationAmount).toBe('24.5');
    expect(result.quote.exchangeRate).toBe('2.45');
    expect(call).toHaveBeenCalledOnce();
  });

  it('returns a not-found error when Horizon has no path', async () => {
    call.mockResolvedValueOnce({ records: [] });

    await expect(findBestSwapPath({
      sourceAsset: { code: 'XLM' },
      destinationAsset: { code: 'USDC', issuer },
      amount: '10',
    })).rejects.toMatchObject({ status: 404 });
  });
});
