// Policy Service Implementation

import { IPolicyService } from './policy';
import { IEventStorageService } from './event-storage';
import { EmergencyLimits, ValidationResult, EmergencyTransferConfig } from '@/types/emergency-transfer';
import { EmergencyConfig } from '@/models/emergency-transfer-config';

export class PolicyService implements IPolicyService {
  private config: EmergencyConfig | null = null;
  private configCache: { data: EmergencyConfig; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private eventStorage: IEventStorageService) {}

  /**
   * Loads configuration from database or cache
   */
  private async loadConfig(): Promise<EmergencyConfig> {
    // Check cache first
    if (this.configCache && Date.now() - this.configCache.timestamp < this.CACHE_TTL) {
      return this.configCache.data;
    }

    // In a real implementation, this would fetch from database
    // For now, return default configuration
    const defaultConfig: EmergencyTransferConfig = {
      enabled: true,
      max_amount_per_transfer: '10000000000', // 1000 XLM in stroops
      max_daily_amount: '50000000000', // 5000 XLM in stroops
      max_monthly_count: 10,
      emergency_fee_percentage: 0.5,
      standard_fee_percentage: 1.0,
      memo_prefix: 'EMERGENCY:',
    };

    const config = new EmergencyConfig(defaultConfig);
    
    // Update cache
    this.configCache = {
      data: config,
      timestamp: Date.now(),
    };

    return config;
  }

  /**
   * Gets daily usage for a user
   */
  private async getDailyUsage(userId: string): Promise<string> {
    return this.eventStorage.getDailyUsage(userId);
  }

  /**
   * Gets monthly count for a user
   */
  private async getMonthlyCount(userId: string): Promise<number> {
    return this.eventStorage.getMonthlyCount(userId);
  }

  /**
   * Validates emergency transfer against limits
   */
  async validateEmergencyTransfer(params: {
    userId: string;
    amount: string;
    assetCode: string;
  }): Promise<ValidationResult> {
    const config = await this.loadConfig();
    const errors: string[] = [];

    // Check if feature is enabled
    if (!config.enabled) {
      errors.push('Emergency transfer feature is currently disabled');
      return {
        valid: false,
        errors,
        remainingLimits: {
          dailyAmount: '0',
          monthlyCount: 0,
        },
      };
    }

    // Parse amounts as BigInt for comparison
    const requestAmount = BigInt(params.amount);
    const maxPerTransfer = BigInt(config.maxAmountPerTransfer);
    const maxDaily = BigInt(config.maxDailyAmount);

    // Check per-transfer limit
    if (requestAmount > maxPerTransfer) {
      errors.push(`Amount exceeds maximum per-transfer limit of ${config.maxAmountPerTransfer}`);
    }

    // Check daily limit
    const dailyUsage = BigInt(await this.getDailyUsage(params.userId));
    const remainingDaily = maxDaily - dailyUsage;
    
    if (requestAmount > remainingDaily) {
      errors.push(`Amount exceeds remaining daily limit of ${remainingDaily.toString()}`);
    }

    // Check monthly count limit
    const monthlyCount = await this.getMonthlyCount(params.userId);
    const remainingMonthlyCount = config.maxMonthlyCount - monthlyCount;
    
    if (remainingMonthlyCount <= 0) {
      errors.push(`Monthly emergency transfer limit of ${config.maxMonthlyCount} reached`);
    }

    return {
      valid: errors.length === 0,
      errors,
      remainingLimits: {
        dailyAmount: remainingDaily.toString(),
        monthlyCount: remainingMonthlyCount,
      },
    };
  }

  /**
   * Gets emergency transfer limits for user
   */
  async getEmergencyLimits(userId: string): Promise<EmergencyLimits> {
    const config = await this.loadConfig();
    
    return {
      maxAmountPerTransfer: config.maxAmountPerTransfer,
      maxDailyAmount: config.maxDailyAmount,
      maxMonthlyCount: config.maxMonthlyCount,
    };
  }

  /**
   * Reloads configuration from database (clears cache)
   */
  async reloadConfig(): Promise<void> {
    this.configCache = null;
    await this.loadConfig();
  }
}
