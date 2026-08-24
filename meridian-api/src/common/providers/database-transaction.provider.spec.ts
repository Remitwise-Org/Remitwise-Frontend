import { DatabaseTransactionProvider } from './database-transaction.provider';

describe('DatabaseTransactionProvider', () => {
  let provider: DatabaseTransactionProvider;
  let manager: Record<string, jest.Mock>;
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: Record<string, jest.Mock>;
  };
  let dataSource: { createQueryRunner: jest.Mock };

  beforeEach(() => {
    manager = {};
    queryRunner = {
      connect: jest.fn(async () => undefined),
      startTransaction: jest.fn(async () => undefined),
      commitTransaction: jest.fn(async () => undefined),
      rollbackTransaction: jest.fn(async () => undefined),
      release: jest.fn(async () => undefined),
      manager,
    };
    dataSource = { createQueryRunner: jest.fn(() => queryRunner) };
    provider = new DatabaseTransactionProvider(dataSource as any);
  });

  it('connects, starts, executes the callback with the manager, commits, and releases', async () => {
    const fn = jest.fn(async () => 'result');

    const result = await provider.executeInTransaction(fn);

    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(fn).toHaveBeenCalledWith(manager);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
    expect(result).toBe('result');
  });

  it('rolls back and rethrows when the callback throws', async () => {
    const fn = jest.fn(async () => {
      throw new Error('write failed');
    });

    await expect(provider.executeInTransaction(fn)).rejects.toThrow(
      'write failed',
    );

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('always releases the runner even when rollback itself throws', async () => {
    const fn = jest.fn(async () => {
      throw new Error('original');
    });
    queryRunner.rollbackTransaction.mockRejectedValueOnce(
      new Error('rollback failed'),
    );

    await expect(provider.executeInTransaction(fn)).rejects.toThrow();
    expect(queryRunner.release).toHaveBeenCalled();
  });
});
