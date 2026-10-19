// Transaction Builder Service Implementation

import { ITransactionBuilder } from './transaction-builder';
import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
  BASE_FEE,
} from '@stellar/stellar-sdk';

export class StellarTransactionBuilder implements ITransactionBuilder {
  private server: Horizon.Server;
  private networkPassphrase: string;
  private emergencyFeePercentage: number;
  private standardFeePercentage: number;
  private memoPrefix: string;

  constructor(config?: {
    horizonUrl?: string;
    networkPassphrase?: string;
    emergencyFeePercentage?: number;
    standardFeePercentage?: number;
    memoPrefix?: string;
  }) {
    this.server = new Horizon.Server(config?.horizonUrl || 'https://horizon-testnet.stellar.org');
    this.networkPassphrase = config?.networkPassphrase || Networks.TESTNET;
    this.emergencyFeePercentage = config?.emergencyFeePercentage || 0.5;
    this.standardFeePercentage = config?.standardFeePercentage || 1.0;
    this.memoPrefix = config?.memoPrefix || 'EMERGENCY:';
  }

  /**
   * Builds an emergency transfer transaction
   */
  async buildEmergencyTransfer(params: {
    sourceAccount: string;
    destinationAccount: string;
    amount: string;
    assetCode: string;
    assetIssuer?: string;
    memo?: string;
    emergency: boolean;
  }): Promise<string> {
    try {
      // Load source account from Stellar network
      const sourceAccount = await this.server.loadAccount(params.sourceAccount);

      // Determine asset
      let asset: Asset;
      if (params.assetCode === 'XLM' || !params.assetCode) {
        asset = Asset.native();
      } else {
        if (!params.assetIssuer) {
          throw new Error('Asset issuer is required for non-native assets');
        }
        asset = new Asset(params.assetCode, params.assetIssuer);
      }

      // Calculate fee
      const fee = await this.calculateEmergencyFee(params.amount);

      // Build transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: params.destinationAccount,
            asset: asset,
            amount: this.convertStroopsToXLM(params.amount),
          })
        )
        .addMemo(Memo.text(`${this.memoPrefix}${params.memo || ''}`))
        .setTimeout(300) // 5 minutes
        .build();

      return transaction.toXDR();
    } catch (error) {
      throw new Error(`Failed to build emergency transfer transaction: ${error}`);
    }
  }

  /**
   * Calculates fee for emergency transfer
   */
  async calculateEmergencyFee(amount: string): Promise<string> {
    // Base Stellar network fee
    const baseFee = parseInt(BASE_FEE);

    // Calculate percentage-based fee
    const amountBigInt = BigInt(amount);
    const feePercentage = BigInt(Math.floor(this.emergencyFeePercentage * 100));
    const percentageFee = (amountBigInt * feePercentage) / BigInt(10000);

    // Use the higher of base fee or percentage fee
    const calculatedFee = percentageFee > BigInt(baseFee) ? percentageFee : BigInt(baseFee);

    return calculatedFee.toString();
  }

  /**
   * Calculates standard fee for comparison
   */
  async calculateStandardFee(amount: string): Promise<string> {
    const baseFee = parseInt(BASE_FEE);
    const amountBigInt = BigInt(amount);
    const feePercentage = BigInt(Math.floor(this.standardFeePercentage * 100));
    const percentageFee = (amountBigInt * feePercentage) / BigInt(10000);

    const calculatedFee = percentageFee > BigInt(baseFee) ? percentageFee : BigInt(baseFee);

    return calculatedFee.toString();
  }

  /**
   * Converts stroops to XLM for Stellar SDK
   */
  private convertStroopsToXLM(stroops: string): string {
    const stroopsBigInt = BigInt(stroops);
    const xlm = Number(stroopsBigInt) / 10000000;
    return xlm.toFixed(7);
  }

  /**
   * Converts XLM to stroops
   */
  private convertXLMToStroops(xlm: string): string {
    const xlmFloat = parseFloat(xlm);
    const stroops = Math.floor(xlmFloat * 10000000);
    return stroops.toString();
  }
}
