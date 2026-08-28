import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Reusable service that wraps any set of database operations in an explicit
 * QueryRunner transaction. Automatically commits on success and rolls back on
 * any thrown error, then releases the runner in the finally block.
 */
@Injectable()
export class DatabaseTransactionProvider {
  private readonly logger = new Logger(DatabaseTransactionProvider.name);

  constructor(private readonly dataSource: DataSource) {}

  async executeInTransaction<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const result = await fn(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Transaction rolled back due to error',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
