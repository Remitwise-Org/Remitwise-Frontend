// Mock entities that import src/-aliased paths not available in Jest
jest.mock('../user.entity', () => ({ User: class User {} }), { virtual: true });
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock('src/tweets/dto/tweet.entity', () => ({ Tweet: class Tweet {} }), {
  virtual: true,
});
jest.mock(
  'src/auth/providers/hashing',
  () => ({ HashingProvider: class HashingProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/mail/providers/mail.provider',
  () => ({ MailProvider: class MailProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/commom/userAlreadyExistException',
  () => ({ UserAlreadyExistException: class UserAlreadyExistException {} }),
  { virtual: true },
);
jest.mock('src/DTO/create-user.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/postparamdto', () => ({}), { virtual: true });
jest.mock('src/DTO/patch-user.dto', () => ({}), { virtual: true });

import { HttpException } from '@nestjs/common';
import { UserService, PerformerIdentity } from './user.services';
import { AuditAction } from '../../audit/audit-log.entity';

describe('UserService', () => {
  let service: UserService;
  let usersRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    softDelete: jest.Mock;
    restore: jest.Mock;
  };
  let createuserprovider: { createUsers: jest.Mock };
  let findOneByemail: { findOneByEmail: jest.Mock };
  let createUserWithBooks: {
    createUserwithBook: jest.Mock;
    getAllUserWithBook: jest.Mock;
  };
  let createManyUserService: { manyUsers: jest.Mock };
  let hashingProvider: { hashPassword: jest.Mock; comparePassword: jest.Mock };
  let auditService: { log: jest.Mock };

  const mockUser = {
    id: 1,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'hashed',
    role: 'user',
  };

  const mockPerformer: PerformerIdentity = {
    userId: 10,
    email: 'admin@example.com',
    ipAddress: '10.0.0.1',
  };

  beforeEach(() => {
    usersRepository = {
      find: jest.fn(async () => [mockUser]),
      findOneBy: jest.fn(async () => ({ ...mockUser })),
      save: jest.fn(async (u) => u),
      softDelete: jest.fn(async () => ({ affected: 1 })),
      restore: jest.fn(async () => ({ affected: 1 })),
    };
    createuserprovider = { createUsers: jest.fn(async () => [mockUser]) };
    findOneByemail = { findOneByEmail: jest.fn(async () => mockUser) };
    createUserWithBooks = {
      createUserwithBook: jest.fn(async () => mockUser),
      getAllUserWithBook: jest.fn(async () => [mockUser]),
    };
    createManyUserService = { manyUsers: jest.fn(async () => [mockUser]) };
    hashingProvider = {
      hashPassword: jest.fn(async () => 'hashed-updated'),
      comparePassword: jest.fn(async () => true),
    };
    auditService = { log: jest.fn(async () => undefined) };

    service = new UserService(
      usersRepository as any,
      createuserprovider as any,
      findOneByemail as any,
      createUserWithBooks as any,
      createManyUserService as any,
      hashingProvider as any,
      auditService as any,
    );
  });

  it('findAll returns users from repository', async () => {
    const result = await service.findAll({} as any, 10, 1);
    expect(result).toEqual([mockUser]);
    expect(usersRepository.find).toHaveBeenCalled();
  });

  it('createUsers delegates to createuserprovider', async () => {
    const dto = {
      email: 'jane@example.com',
      password: 'pass',
      firstName: 'Jane',
      lastName: 'Doe',
    } as any;
    const result = await service.createUsers(dto);
    expect(createuserprovider.createUsers).toHaveBeenCalledWith(dto);
    expect(result).toEqual([mockUser]);
  });

  it('GetOneByEmail delegates to findOneByemail', async () => {
    const result = await service.GetOneByEmail('jane@example.com');
    expect(findOneByemail.findOneByEmail).toHaveBeenCalledWith(
      'jane@example.com',
    );
    expect(result).toEqual(mockUser);
  });

  it('findOneId returns user when found', async () => {
    const result = await service.findOneId(1);
    expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    expect(result).toEqual(mockUser);
  });

  it('findOneId throws NOT_FOUND when user is missing', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOneId(99)).rejects.toThrow(HttpException);
  });

  it('editUser saves updated user', async () => {
    const dto = { id: 1, firstName: 'Updated' } as any;
    await service.editUser(dto);
    expect(usersRepository.save).toHaveBeenCalled();
  });

  it('editUser hashes a provided password instead of storing plaintext (issue #631)', async () => {
    usersRepository.findOneBy.mockResolvedValueOnce({ ...mockUser });

    await service.editUser({ id: 1, password: 'NewPass1!' } as any);

    expect(hashingProvider.hashPassword).toHaveBeenCalledWith('NewPass1!');
    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashed-updated' }),
    );
  });

  it('editUser keeps existing fields when fields are missing', async () => {
    const stored = { ...mockUser };
    usersRepository.findOneBy.mockResolvedValueOnce(stored);
    usersRepository.save.mockImplementationOnce(async (u) => u);

    const result = await service.editUser({ id: 1 } as any);

    expect(result).toMatchObject({
      firstName: stored.firstName,
      lastName: stored.lastName,
      email: stored.email,
      password: stored.password,
    });
  });

  it('deleteUser throws HttpException', async () => {
    usersRepository.findOneBy.mockResolvedValueOnce(null);
    await expect(service.deleteUser(999)).rejects.toThrow(HttpException);
  });

  it('createMany delegates to the createManyUserService', async () => {
    const dto = { users: [{ email: 'a@b.com' }, { email: 'c@d.com' }] } as any;
    const result = await service.createMany(dto);
    expect(createManyUserService.manyUsers).toHaveBeenCalledWith(dto);
    expect(result).toEqual([mockUser]);
  });

  it('createUserWithBook delegates to the createUserWithBooks provider', async () => {
    const dto = { email: 'a@b.com', password: 'pw' } as any;
    const result = await service.createUserWithBook(dto);
    expect(createUserWithBooks.createUserwithBook).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockUser);
  });

  it('getAllUserWithBook delegates to the createUserWithBooks provider', async () => {
    const result = await service.getAllUserWithBook();
    expect(createUserWithBooks.getAllUserWithBook).toHaveBeenCalled();
    expect(result).toEqual([mockUser]);
  });

  it('findOneById returns the matching user', async () => {
    const result = await service.findOneById(42);
    expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: 42 });
    expect(result).toEqual(mockUser);
  });

  it('findOneById returns null for an unknown id', async () => {
    usersRepository.findOneBy.mockResolvedValueOnce(null);
    const result = await service.findOneById(404);
    expect(result).toBeNull();
  });

  // ── Audit parity tests (issue #1678) ────────────────────────────────

  describe('audit logging on privileged operations', () => {
    it('deleteUser emits DELETE audit with previous state and performer', async () => {
      const result = await service.deleteUser(1, mockPerformer);

      expect(result).toEqual({ deleted: true, id: 1 });
      expect(auditService.log).toHaveBeenCalledTimes(1);
      const call = auditService.log.mock.calls[0][0];
      expect(call.entityName).toBe('User');
      expect(call.entityId).toBe('1');
      expect(call.action).toBe(AuditAction.DELETE);
      expect(call.performedById).toBe(10);
      expect(call.performedByEmail).toBe('admin@example.com');
      expect(call.ipAddress).toBe('10.0.0.1');
      expect(call.previousValues).toEqual({
        id: 1,
        email: 'jane@example.com',
        role: 'user',
      });
      expect(call.newValues).toEqual({ deleted: true });
    });

    it('deleteUser does not emit audit when user not found', async () => {
      usersRepository.findOneBy.mockResolvedValueOnce(null);
      await expect(service.deleteUser(999, mockPerformer)).rejects.toThrow(
        HttpException,
      );
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('deleteUser works without performer (anonymous/system)', async () => {
      const result = await service.deleteUser(1);
      expect(result).toEqual({ deleted: true, id: 1 });
      expect(auditService.log).toHaveBeenCalledTimes(1);
      const call = auditService.log.mock.calls[0][0];
      expect(call.performedById).toBeNull();
      expect(call.performedByEmail).toBeNull();
    });

    it('assignRole emits UPDATE audit with previous and new role', async () => {
      const result = await service.assignRole(1, 'admin' as any, mockPerformer);

      expect(result.role).toBe('admin');
      expect(auditService.log).toHaveBeenCalledTimes(1);
      const call = auditService.log.mock.calls[0][0];
      expect(call.entityName).toBe('User');
      expect(call.entityId).toBe('1');
      expect(call.action).toBe(AuditAction.UPDATE);
      expect(call.performedById).toBe(10);
      expect(call.previousValues).toEqual({ role: 'user' });
      expect(call.newValues).toEqual({ role: 'admin' });
    });

    it('restoreUser emits UPDATE audit with restoration context', async () => {
      usersRepository.findOneBy.mockResolvedValueOnce({
        ...mockUser,
        role: 'verified_user',
      });
      const result = await service.restoreUser(1, mockPerformer);

      expect(result).toEqual({ restored: true, id: 1 });
      expect(auditService.log).toHaveBeenCalledTimes(1);
      const call = auditService.log.mock.calls[0][0];
      expect(call.entityName).toBe('User');
      expect(call.entityId).toBe('1');
      expect(call.action).toBe(AuditAction.UPDATE);
      expect(call.performedById).toBe(10);
      expect(call.previousValues).toEqual({ deleted: true });
      expect(call.newValues).toMatchObject({ restored: true });
    });

    it('restoreUser does not emit audit when user not found', async () => {
      usersRepository.restore.mockResolvedValueOnce({ affected: 0 });
      await expect(service.restoreUser(999, mockPerformer)).rejects.toThrow(
        HttpException,
      );
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('audit failure does not block deleteUser', async () => {
      auditService.log.mockRejectedValueOnce(new Error('DB down'));
      const result = await service.deleteUser(1, mockPerformer);
      expect(result).toEqual({ deleted: true, id: 1 });
    });

    it('audit failure does not block assignRole', async () => {
      auditService.log.mockRejectedValueOnce(new Error('DB down'));
      const result = await service.assignRole(1, 'admin' as any, mockPerformer);
      expect(result.role).toBe('admin');
    });

    it('audit failure does not block restoreUser', async () => {
      auditService.log.mockRejectedValueOnce(new Error('DB down'));
      usersRepository.findOneBy.mockResolvedValueOnce({ ...mockUser });
      const result = await service.restoreUser(1, mockPerformer);
      expect(result).toEqual({ restored: true, id: 1 });
    });
  });
});
