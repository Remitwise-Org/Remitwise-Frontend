// Transaction Builder Service Interface

export interface ITransactionBuilder {
  /**
   * Builds an emergency transfer transaction
   */
  buildEmergencyTransfer(params: {
    sourceAccount: string;
    destinationAccount: string;
    amount: string;
    assetCode: string;
    assetIssuer?: string;
    memo?: string;
    emergency: boolean;
  }): Promise<string>; // Returns XDR
  
  /**
   * Calculates fee for emergency transfer
   */
  calculateEmergencyFee(amount: string): Promise<string>;
}
