jest.mock('../user.entity', () => ({ User: class User {} }));
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock('src/tweets/dto/tweet.entity', () => ({ Tweet: class Tweet {} }), {
  virtual: true,
});
jest.mock(
  'src/commom/userAlreadyExistException',
  () => ({ UserAlreadyExistException: class UserAlreadyExistException {} }),
  { virtual: true },
);
jest.mock('src/DTO/create-user.dto', () => ({}), { virtual: true });
jest.mock('./createManyUser.Provider', () => ({
  CreateManyUser: class CreateManyUser {},
}));

import { CreateUserBookProvider } from './createUserWithBook';

describe('CreateUserBookProvider', () => {
  let provider: CreateUserBookProvider;
  let userRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };

  const dto: any = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'pw',
  };

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({ id: 1, ...entity })),
      find: jest.fn(async () => [{ id: 1, email: 'ada@example.com' }]),
    };
    provider = new CreateUserBookProvider(userRepository as any);
  });

  describe('createUserwithBook', () => {
    it('returns the persisted user on a fresh email', async () => {
      const result = await provider.createUserwithBook(dto);
      expect(userRepository.create).toHaveBeenCalledWith({ ...dto });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 1, email: dto.email });
    });

    it('rethrows unexpected errors from the repository', async () => {
      userRepository.save.mockRejectedValueOnce(new Error('boom'));
      await expect(provider.createUserwithBook(dto)).rejects.toThrow('boom');
    });
  });

  describe('getAllUserWithBook', () => {
    it('returns the users with their related books', async () => {
      const result = await provider.getAllUserWithBook();
      expect(userRepository.find).toHaveBeenCalledWith({ relations: ['book'] });
      expect(result).toEqual([{ id: 1, email: 'ada@example.com' }]);
    });
  });
});
