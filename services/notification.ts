// Notification Service Interface

export interface INotificationService {
  /**
   * Sends emergency transfer notification to family members
   */
  notifyFamilyMembers(params: {
    userId: string;
    amount: string;
    assetCode: string;
    timestamp: Date;
  }): Promise<void>;
  
  /**
   * Gets list of notification recipients for a user
   */
  getNotificationRecipients(userId: string): Promise<string[]>;
}
