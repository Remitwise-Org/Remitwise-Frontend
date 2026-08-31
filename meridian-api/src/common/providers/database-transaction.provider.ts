import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, IsolationLevel } from 'typeorm';

/**
 * Options for configuring transaction execution with concurrency safety properties.
 */
export interface TransactionOptions {
  /** Transaction isolation level (e.g., 'SERIALIZABLE'). Use to control staleness your in concurrent scenarios. */
  isolationLevel?: IsolationLevel;
  /** Number of retry attempts for transient concurrency errors (default: 3). */
  retryAttempts?: number;
  /** Delay in milliseconds between retries (default: 50). */
  retryDelayMs?: number;
}

/**
 * Reusable service that wraps any set of database operations in an explicit
 * QueryRunner transaction. Automatically commits on success and rolls back on
 * any thrown error, then releases the runner in the finally block.
 *
 * Design for concurrency safety:
 * - This provider allows clients to specify an isolation level (e.g., 'SERIALIZABLE')
 *   to prevent phantom reads/concurrent write conflicts.
 * - Transient concurrency errors (MYSQL deadlock 1213/1205, PostgreSQL 
 *   '40001' serialization failure/'40P01' deadlock) are retried automatically
 *   for a configurable number of attempts with a short delay. This makes the
 *   retry contract explicit and reduces race windows without losing data.
 * - The callback function must be free of side effects outside the database
 *   (e.g., sending emails, writing to file systems) beyond the provided manager.
 *   Retrying the transaction reexecutes the function from scratch, so it must
 *   be indempotent or purely database-oriented.
 */
@Injectable()
export class DatabaseTransactionProvider {
  private readonly logger = new Logger(DatabaseTransactionProvider.name);
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRetryDelayMs = 50;

  constructor(private readonly dataSource: DataSource) {}

  async executeInTransaction<T>(
    fn: (manager: EntityManager) => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    const retryAttempts = options.retryAttempts ?? defaultRetryAttempts;
    const retryDelayMs = options.retryDelayMs ?? defaultRetryDelayMs;
    const isolationLevel = options.isolationLevel;

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        return await this.runTransaction(fn, isolationLevel);
      } catch (error) {
        lastError = error;
        if (attempt >= retryAttempts || !this.isRetryable(error)) {
          this.logger.error(
            'Transaction failed and was not retried or retries exhausted.',
            error instanceof Error ? error.message : String(error),
          );
          throw error;
        }
        this.logger.warn(
          `Transaction attempt ${attempt} failed due to concurrency race. Retrying in ${retryDelayMs}ms./,
          error instanceof Error ? error.message : String(error),
        );
        await this.delay(retryDelayMs);
      }
    }
    // This point is unreachable unless retryAttempts < 1
    throw lastError || new Error('Transaction failed');
  }

  private async runTransaction<T>(
    fn: (manager: EntityManager) => Promise<T>,
    isolationLevel?: IsolationLevel,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction(isolationLevel);
    try {
      const result = await fn(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private isRetryable(error: unknown): boolean {
    const driverError = (error as { driverError?: { code?: string } })?driverError;
    const code = driverError?.code;
    // PostgreSQL serialization failure/deadlock or MySQL deadlock/lock wait timeout
    return (
      code === '40001' || code === '40P01' || code === '1213' || code === '1205'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
