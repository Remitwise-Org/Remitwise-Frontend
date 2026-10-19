// Emergency Transfer Event Model

import { EmergencyTransferEventModel } from '@/types/emergency-transfer';

export class EmergencyTransferEvent {
  id: string;
  userId: string;
  recipientAddress: string;
  amount: string;
  assetCode: string;
  assetIssuer: string | null;
  transactionId: string;
  stellarTxHash: string | null;
  memo: string | null;
  fee: string;
  emergencyFeeApplied: boolean;
  status: 'pending' | 'signed' | 'submitted' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  metadata: any | null;

  constructor(data: Partial<EmergencyTransferEventModel>) {
    this.id = data.id || '';
    this.userId = data.user_id || '';
    this.recipientAddress = data.recipient_address || '';
    this.amount = data.amount || '';
    this.assetCode = data.asset_code || 'XLM';
    this.assetIssuer = data.asset_issuer || null;
    this.transactionId = data.transaction_id || '';
    this.stellarTxHash = data.stellar_tx_hash || null;
    this.memo = data.memo || null;
    this.fee = data.fee || '';
    this.emergencyFeeApplied = data.emergency_fee_applied || false;
    this.status = (data.status as any) || 'pending';
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
    this.metadata = data.metadata || null;
  }

  toDatabase(): EmergencyTransferEventModel {
    return {
      id: this.id,
      user_id: this.userId,
      recipient_address: this.recipientAddress,
      amount: this.amount,
      asset_code: this.assetCode,
      asset_issuer: this.assetIssuer,
      transaction_id: this.transactionId,
      stellar_tx_hash: this.stellarTxHash,
      memo: this.memo,
      fee: this.fee,
      emergency_fee_applied: this.emergencyFeeApplied,
      status: this.status,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      metadata: this.metadata,
    };
  }

  static fromDatabase(data: EmergencyTransferEventModel): EmergencyTransferEvent {
    return new EmergencyTransferEvent(data);
  }
}
