// Policy Service Interface

import { EmergencyLimits, ValidationResult } from '@/types/emergency-transfer';

export interface IPolicyService {
  /**
   * Validates emergency transfer against limits
   */
  validateEmergencyTransfer(params: {
    userId: string;
    amount: string;
    assetCode: string;
  }): Promise<ValidationResult>;
  
  /**
   * Gets emergency transfer limits for user
   */
  getEmergencyLimits(userId: string): Promise<EmergencyLimits>;
}
