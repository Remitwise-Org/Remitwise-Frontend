// Notification Service Implementation

import { INotificationService } from './notification';

interface NotificationPayload {
  userId: string;
  amount: string;
  assetCode: string;
  timestamp: Date;
  senderName?: string;
}

export class NotificationService implements INotificationService {
  // In-memory storage for family members (in production, this would be a database)
  private familyMembers: Map<string, string[]> = new Map();

  /**
   * Sends emergency transfer notification to family members
   */
  async notifyFamilyMembers(params: {
    userId: string;
    amount: string;
    assetCode: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Get list of family members to notify
      const recipients = await this.getNotificationRecipients(params.userId);

      // If no family members, skip notification
      if (recipients.length === 0) {
        console.log(`No family members to notify for user ${params.userId}`);
        return;
      }

      // Build notification payload
      const payload = this.buildNotificationPayload(params);

      // Send notifications to each family member
      for (const recipient of recipients) {
        await this.sendNotification(recipient, payload);
      }

      console.log(`Sent emergency transfer notifications to ${recipients.length} family members`);
    } catch (error) {
      // Log error but don't throw - notification failures shouldn't block transfers
      console.error(`Failed to send emergency transfer notifications: ${error}`);
    }
  }

  /**
   * Gets list of notification recipients for a user
   */
  async getNotificationRecipients(userId: string): Promise<string[]> {
    // In production, this would query the database:
    // SELECT family_member_id FROM user_family_members WHERE user_id = $1 AND notifications_enabled = true
    
    const recipients = this.familyMembers.get(userId) || [];
    return recipients;
  }

  /**
   * Adds a family member for a user
   */
  async addFamilyMember(userId: string, familyMemberId: string): Promise<void> {
    const current = this.familyMembers.get(userId) || [];
    if (!current.includes(familyMemberId)) {
      current.push(familyMemberId);
      this.familyMembers.set(userId, current);
    }
  }

  /**
   * Removes a family member for a user
   */
  async removeFamilyMember(userId: string, familyMemberId: string): Promise<void> {
    const current = this.familyMembers.get(userId) || [];
    const updated = current.filter(id => id !== familyMemberId);
    this.familyMembers.set(userId, updated);
  }

  /**
   * Builds notification payload with all required information
   */
  private buildNotificationPayload(params: {
    userId: string;
    amount: string;
    assetCode: string;
    timestamp: Date;
  }): NotificationPayload {
    return {
      userId: params.userId,
      amount: this.formatAmount(params.amount, params.assetCode),
      assetCode: params.assetCode,
      timestamp: params.timestamp,
      senderName: this.getUserName(params.userId),
    };
  }

  /**
   * Sends notification to a recipient
   */
  private async sendNotification(
    recipientId: string,
    payload: NotificationPayload
  ): Promise<void> {
    // In production, this would send via email, push notification, or webhook
    // For now, just log the notification
    console.log(`Notification to ${recipientId}:`, {
      subject: 'Emergency Transfer Alert',
      message: `${payload.senderName || 'A user'} has initiated an emergency transfer of ${payload.amount} ${payload.assetCode} at ${payload.timestamp.toISOString()}`,
      data: payload,
    });

    // Example production implementations:
    // - Email: await emailService.send(recipientEmail, subject, body)
    // - Push: await pushService.send(recipientDeviceToken, notification)
    // - Webhook: await axios.post(webhookUrl, payload)
  }

  /**
   * Formats amount for display
   */
  private formatAmount(stroops: string, assetCode: string): string {
    if (assetCode === 'XLM') {
      const xlm = Number(BigInt(stroops)) / 10000000;
      return xlm.toFixed(2);
    }
    return stroops;
  }

  /**
   * Gets user name for notification
   */
  private getUserName(userId: string): string {
    // In production, this would query the database
    return `User ${userId}`;
  }

  /**
   * Validates notification payload
   */
  private validatePayload(payload: NotificationPayload): boolean {
    return !!(
      payload.userId &&
      payload.amount &&
      payload.assetCode &&
      payload.timestamp
    );
  }
}
