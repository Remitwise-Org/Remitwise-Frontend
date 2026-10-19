import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolicyService } from '../../../services/policy-service';
import { IEventStorageService } from '../../../services/event-storage';
import { EmergencyTransferEvent, EventFilters } from '../../../types/emergency-transfer';

class MockEventStorage implements IEventStorageService {
  public dailyUsage = '0';
  public monthlyCount = 0;

  async getDailyUsage(userId: string): Promise<string> {
    return this.dailyUsage;
  }

  async getMonthlyCount(userId: string): Promise<number> {
    return this.monthlyCount;
  }

  // Stubs for the rest of the interface to satisfy IEventStorageService
  async storeEmergencyEvent(event: EmergencyTransferEvent): Promise<void> {}
  async getEmergencyEvents(filters: EventFilters): Promise<EmergencyTransferEvent[]> { return []; }
  async getEventByTransactionId(txId: string): Promise<EmergencyTransferEvent | null> { return null; }
  async updateEventStatus(txId: string, status: string, hash?: string): Promise<void> {}
}

describe('PolicyService', () => {
  let policyService: PolicyService;
  let mockEventStorage: MockEventStorage;

  beforeEach(() => {
    mockEventStorage = new MockEventStorage();
    policyService = new PolicyService(mockEventStorage);
  });

  describe('validateEmergencyTransfer', () => {
    it('passes when under all limits', async () => {
      mockEventStorage.dailyUsage = '10000000000'; // 1000 XLM used
      mockEventStorage.monthlyCount = 2; // 2 transfers this month

      const result = await policyService.validateEmergencyTransfer({
        userId: 'test-user',
        amount: '5000000000', // 500 XLM
        assetCode: 'XLM'
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.remainingLimits.dailyAmount).toBe('40000000000'); // 5000 - 1000
      expect(result.remainingLimits.monthlyCount).toBe(8); // 10 - 2
    });

    it('passes exactly at the per-transfer boundary limit', async () => {
      const result = await policyService.validateEmergencyTransfer({
        userId: 'test-user',
        amount: '10000000000', // exactly max_amount_per_transfer
        assetCode: 'XLM'
      });

      expect(result.valid).toBe(true);
    });

    it('passes exactly at the daily boundary limit (multiple transfers)', async () => {
      mockEventStorage.dailyUsage = '40000000000'; // 4000 XLM used
      
      const result = await policyService.validateEmergencyTransfer({
        userId: 'test-user',
        amount: '10000000000', // exactly adding up to 50000000000 max_daily_amount
        assetCode: 'XLM'
      });

      expect(result.valid).toBe(true);
      expect(result.remainingLimits.dailyAmount).toBe('10000000000'); // Note: Remaining limit is before deducting current request
    });

    it('fails when exceeding per-transfer limit', async () => {
      const result = await policyService.validateEmergencyTransfer({
        userId: 'test-user',
        amount: '10000000001', // max_amount_per_transfer + 1 stroop
        assetCode: 'XLM'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount exceeds maximum per-transfer limit of 10000000000');
    });

    it('fails when exceeding daily limit due to existing usage', async () => {
      mockEventStorage.dailyUsage = '45000000000'; // 4500 XLM used
      
      const result = await policyService.validateEmergencyTransfer({
        userId: 'test-user',
        amount: '6000000000', // 600 XLM (4500 + 600 = 5100 > 5000 max)
        assetCode: 'XLM'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount exceeds remaining daily limit of 5000000000');
    });

    it('fails when monthly count limit is reached', async () => {
      mockEventStorage.monthlyCount = 10; // max_monthly_count reached
      
      const result = await policyService.validateEmergencyTransfer({
        userId: 'test-user',
        amount: '1000000', // tiny amount
        assetCode: 'XLM'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Monthly emergency transfer limit of 10 reached');
    });

    it('accumulates multiple errors if multiple limits exceeded', async () => {
      mockEventStorage.monthlyCount = 10;
      
      const result = await policyService.validateEmergencyTransfer({
        userId: 'test-user',
        amount: '20000000000', // exceeds per-transfer limit
        assetCode: 'XLM'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some(e => e.includes('per-transfer limit'))).toBe(true);
      expect(result.errors.some(e => e.includes('Monthly emergency transfer limit'))).toBe(true);
    });

    it('handles BigInt arithmetic correctly without float drift', async () => {
      // Numbers larger than Number.MAX_SAFE_INTEGER
      mockEventStorage.dailyUsage = '9007199254740991'; // MAX_SAFE_INTEGER
      
      // Override default config for testing huge numbers using mocked reload config
      // The service uses loadConfig() internally which checks a 5m cache.
      // We can rely on the default config which max daily is 50000000000 (5e10). 
      // Since 9007199254740991 > 50000000000, it should fail immediately.
      const result = await policyService.validateEmergencyTransfer({
        userId: 'test-user',
        amount: '1000',
        assetCode: 'XLM'
      });
      
      expect(result.valid).toBe(false);
      // The remaining daily limit is negative: 50000000000 - 9007199254740991
      const remaining = BigInt('50000000000') - BigInt('9007199254740991');
      expect(result.errors).toContain(`Amount exceeds remaining daily limit of ${remaining.toString()}`);
    });
  });

  describe('getEmergencyLimits', () => {
    it('returns the configured limits', async () => {
      const limits = await policyService.getEmergencyLimits('test-user');
      expect(limits.maxAmountPerTransfer).toBe('10000000000');
      expect(limits.maxDailyAmount).toBe('50000000000');
      expect(limits.maxMonthlyCount).toBe(10);
    });
  });
});
