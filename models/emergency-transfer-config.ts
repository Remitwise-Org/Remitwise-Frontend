// Emergency Transfer Configuration Model

import { EmergencyTransferConfig } from '@/types/emergency-transfer';

export class EmergencyConfig {
  enabled: boolean;
  maxAmountPerTransfer: string;
  maxDailyAmount: string;
  maxMonthlyCount: number;
  emergencyFeePercentage: number;
  standardFeePercentage: number;
  memoPrefix: string;

  constructor(data: Partial<EmergencyTransferConfig>) {
    this.enabled = data.enabled ?? true;
    this.maxAmountPerTransfer = data.max_amount_per_transfer || '10000000000'; // 1000 XLM in stroops
    this.maxDailyAmount = data.max_daily_amount || '50000000000'; // 5000 XLM in stroops
    this.maxMonthlyCount = data.max_monthly_count || 10;
    this.emergencyFeePercentage = data.emergency_fee_percentage || 0.5;
    this.standardFeePercentage = data.standard_fee_percentage || 1.0;
    this.memoPrefix = data.memo_prefix || 'EMERGENCY:';
  }

  toDatabase(): EmergencyTransferConfig {
    return {
      enabled: this.enabled,
      max_amount_per_transfer: this.maxAmountPerTransfer,
      max_daily_amount: this.maxDailyAmount,
      max_monthly_count: this.maxMonthlyCount,
      emergency_fee_percentage: this.emergencyFeePercentage,
      standard_fee_percentage: this.standardFeePercentage,
      memo_prefix: this.memoPrefix,
    };
  }

  static fromDatabase(data: EmergencyTransferConfig): EmergencyConfig {
    return new EmergencyConfig(data);
  }
}
