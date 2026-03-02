// Event Storage Service Implementation

import { IEventStorageService } from './event-storage';
import { EmergencyTransferEvent, EventFilters } from '@/types/emergency-transfer';
import { EmergencyTransferEvent as EventModel } from '@/models/emergency-transfer-event';


export class EventStorageService implements IEventStorageService {
  // In-memory storage for demonstration
  // In production, this would use a real database connection
  private events: Map<string, EmergencyTransferEvent> = new Map();

  /**
   * Stores emergency transfer event
   */
  async storeEmergencyEvent(event: EmergencyTransferEvent): Promise<void> {
    try {
      // Generate ID if not provided
      if (!event.id) {
        event.id = crypto.randomUUID();
      }

      // Set timestamps
      if (!event.timestamp) {
        event.timestamp = new Date();
      }

      // Validate required fields
      this.validateEvent(event);

      // Store event (in production, this would be a database insert)
      this.events.set(event.id, event);

      // In production, this would execute:
      // await db.query(
      //   `INSERT INTO emergency_transfer_events 
      //    (id, user_id, recipient_address, amount, asset_code, asset_issuer, 
      //     transaction_id, memo, fee, emergency_fee_applied, status, created_at, updated_at, metadata)
      //    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      //   [event.id, event.userId, event.recipientAddress, event.amount, ...]
      // );
    } catch (error) {
      throw new Error(`Failed to store emergency transfer event: ${error}`);
    }
  }

  /**
   * Retrieves emergency events for analytics
   */
  async getEmergencyEvents(filters: EventFilters): Promise<EmergencyTransferEvent[]> {
    try {
      let results = Array.from(this.events.values());

      // Apply filters
      if (filters.userId) {
        results = results.filter(e => e.userId === filters.userId);
      }

      if (filters.status) {
        results = results.filter(e => e.status === filters.status);
      }

      if (filters.startDate) {
        results = results.filter(e => e.timestamp >= filters.startDate!);
      }

      if (filters.endDate) {
        results = results.filter(e => e.timestamp <= filters.endDate!);
      }

      // Sort by timestamp descending
      results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply limit
      if (filters.limit) {
        results = results.slice(0, filters.limit);
      }

      return results;

      // In production, this would execute:
      // const query = `
      //   SELECT * FROM emergency_transfer_events
      //   WHERE ($1::text IS NULL OR user_id = $1)
      //   AND ($2::text IS NULL OR status = $2)
      //   AND ($3::timestamp IS NULL OR created_at >= $3)
      //   AND ($4::timestamp IS NULL OR created_at <= $4)
      //   ORDER BY created_at DESC
      //   LIMIT $5
      // `;
      // const result = await db.query(query, [
      //   filters.userId, filters.status, filters.startDate, filters.endDate, filters.limit || 100
      // ]);
      // return result.rows.map(row => EventModel.fromDatabase(row));
    } catch (error) {
      throw new Error(`Failed to retrieve emergency transfer events: ${error}`);
    }
  }

  /**
   * Gets event by transaction ID
   */
  async getEventByTransactionId(transactionId: string): Promise<EmergencyTransferEvent | null> {
    const event = Array.from(this.events.values()).find(
      e => e.transactionId === transactionId
    );
    return event || null;
  }

  /**
   * Updates event status
   */
  async updateEventStatus(
    transactionId: string,
    status: 'pending' | 'signed' | 'submitted' | 'failed',
    stellarTxHash?: string
  ): Promise<void> {
    const event = await this.getEventByTransactionId(transactionId);
    if (!event) {
      throw new Error(`Event not found for transaction ID: ${transactionId}`);
    }

    event.status = status;
    if (stellarTxHash) {
      (event as any).stellarTxHash = stellarTxHash;
    }

    this.events.set(event.id, event);
  }

  /**
   * Validates event has all required fields
   */
  private validateEvent(event: EmergencyTransferEvent): void {
    const requiredFields = [
      'userId',
      'recipientAddress',
      'amount',
      'assetCode',
      'transactionId',
    ];

    for (const field of requiredFields) {
      if (!(event as any)[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Gets daily usage for a user
   */
  async getDailyUsage(userId: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await this.getEmergencyEvents({
      userId,
      startDate: today,
      status: 'submitted',
    });

    const total = events.reduce((sum, event) => {
      return sum + BigInt(event.amount);
    }, BigInt(0));

    return total.toString();
  }

  /**
   * Gets monthly count for a user
   */
  async getMonthlyCount(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const events = await this.getEmergencyEvents({
      userId,
      startDate: startOfMonth,
    });

    return events.length;
  }
}
