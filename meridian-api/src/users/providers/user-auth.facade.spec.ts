// Mock entities that import src/-aliased paths not available in Jest
jest.mock('../user.entity', () => ({ User: class User {} }), { virtual: true });
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock(
  'src/tweets/entities/tweet.entity',
  () => ({ Tweet: class Tweet {} }),
  {
    virtual: true,
  },
);

import { UserAuthFacade } from './user-auth.facade';

describe('UserAuthFacade', () => {
  let facade: UserAuthFacade;
  let findOneByEmail: { findOneByEmail: jest.Mock };

  const mockUser = { id: 1, email: 'a@b.com' };

  beforeEach(() => {
    findOneByEmail = { findOneByEmail: jest.fn(async () => mockUser) };
    facade = new UserAuthFacade(findOneByEmail as any);
  });

  it('findUserByEmail delegates to FindOneByEmail provider', async () => {
    const result = await facade.findUserByEmail('a@b.com');
    expect(findOneByEmail.findOneByEmail).toHaveBeenCalledWith('a@b.com');
    expect(result).toEqual(mockUser);
  });
});
