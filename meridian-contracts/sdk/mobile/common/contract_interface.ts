// Mobile-Optimized Contract Interface (TypeScript)
// This file defines the main interface for interacting with PropChain contracts from mobile apps.

export interface PropertyInfo {
  id: string;
  owner: string;
  location: string;
  valuation: number;
  metadataUri: string;
}

export interface TransactionResult {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface PropChainMobileSDK {
  getPropertyInfo(propertyId: string): Promise<PropertyInfo>;
  transferProperty(propertyId: string, to: string): Promise<TransactionResult>;
  signTransactionOffline(txData: object): Promise<string>; // Returns signed tx
  scanQRCode(): Promise<string>; // Returns scanned data
  subscribeToPropertyUpdates(propertyId: string, callback: (update: any) => void): void;
  authenticateBiometric(): Promise<boolean>;
  onError(callback: (error: string) => void): void;
}
