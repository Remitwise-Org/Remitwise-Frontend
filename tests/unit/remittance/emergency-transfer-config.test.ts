import { EmergencyConfig } from '@/models/emergency-transfer-config';
import { EmergencyTransferConfig } from '@/types/emergency-transfer';

describe('EmergencyConfig', () => {
  it('uses defaults when configuration is missing', () => {
    const config = new EmergencyConfig({});

    expect(config.enabled).toBe(true);
    expect(config.maxAmountPerTransfer).toBe('10000000000');
    expect(config.maxDailyAmount).toBe('50000000000');
    expect(config.maxMonthlyCount).toBe(10);
    expect(config.emergencyFeePercentage).toBe(0.5);
    expect(config.standardFeePercentage).toBe(1.0);
    expect(config.memoPrefix).toBe('EMERGENCY:');
  });

  it('preserves explicit zero and empty values', () => {
    const config = new EmergencyConfig({
      enabled: false,
      max_amount_per_transfer: '0',
      max_daily_amount: '0',
      max_monthly_count: 0,
      emergency_fee_percentage: 0,
      standard_fee_percentage: 0,
      memo_prefix: '',
    });

    expect(config.enabled).toBe(false);
    expect(config.maxAmountPerTransfer).toBe('0');
    expect(config.maxDailyAmount).toBe('0');
    expect(config.maxMonthlyCount).toBe(0);
    expect(config.emergencyFeePercentage).toBe(0);
    expect(config.standardFeePercentage).toBe(0);
    expect(config.memoPrefix).toBe('');
  });

  it('round-trips between model and database representation', () => {
    const dbConfig: EmergencyTransferConfig = {
      enabled: false,
      max_amount_per_transfer: '12345',
      max_daily_amount: '67890',
      max_monthly_count: 3,
      emergency_fee_percentage: 0.25,
      standard_fee_percentage: 0.75,
      memo_prefix: 'TEST:',
    };

    const config = EmergencyConfig.fromDatabase(dbConfig);
    expect(config.toDatabase()).toEqual(dbConfig);
  });
});
