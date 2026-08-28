jest.mock('../user.entity', () => ({ User: class User {} }));
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock('src/tweets/dto/tweet.entity', () => ({ Tweet: class Tweet {} }), {
  virtual: true,
});
jest.mock('src/DTO/create-user.dto', () => ({}), { virtual: true });
jest.mock('../dtos/createManyUserdto', () => ({}), { virtual: true });

import { CreateManyUser } from './createManyUser.Provider';

describe('CreateManyUser', () => {
  let service: CreateManyUser;
  let saved: any[];
  let manager: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
  };
  let dataSource: { createQueryRunner: jest.Mock };

  beforeEach(() => {
    saved = [];
    manager = {
      create: jest.fn((Entity, entity) => entity),
      save: jest.fn(async (entity) => {
        saved.push({ id: saved.length + 1, ...entity });
        return saved[saved.length - 1];
      }),
    };
    queryRunner = {
      connect: jest.fn(async () => undefined),
      startTransaction: jest.fn(async () => undefined),
      commitTransaction: jest.fn(async () => undefined),
      rollbackTransaction: jest.fn(async () => undefined),
      release: jest.fn(async () => undefined),
    };
    dataSource = {
      createQueryRunner: jest.fn(() => ({ manager, ...queryRunner })),
    };

    service = new CreateManyUser(dataSource as any);
  });

  it('creates a query runner, commits the transaction, and persists each user', async () => {
    const dto = {
      users: [
        { firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'pw' },
        { firstName: 'C', lastName: 'D', email: 'c@d.com', password: 'pw' },
      ],
    } as any;

    const result = await service.manyUsers(dto);

    expect(dataSource.createQueryRunner).toHaveBeenCalled();
    const runner = dataSource.createQueryRunner.mock.results[0].value;
    expect(runner.connect).toHaveBeenCalled();
    expect(runner.startTransaction).toHaveBeenCalled();
    expect(manager.create).toHaveBeenCalledTimes(2);
    expect(manager.save).toHaveBeenCalledTimes(2);
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('rolls back the transaction when one of the saves fails', async () => {
    manager.save.mockRejectedValueOnce(new Error('write failed'));
    manager.save.mockResolvedValueOnce({ id: 1 });

    const dto = { users: [{ email: 'a@b.com' }, { email: 'c@d.com' }] } as any;

    const result = await service.manyUsers(dto);

    const runner = dataSource.createQueryRunner.mock.results[0].value;
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
