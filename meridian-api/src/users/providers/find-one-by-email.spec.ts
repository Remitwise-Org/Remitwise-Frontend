jest.mock('../user.entity', () => ({ User: class User {} }));
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock('src/tweets/dto/tweet.entity', () => ({ Tweet: class Tweet {} }), {
  virtual: true,
});

import { RequestTimeoutException, UnauthorizedException } from '@nestjs/common';
import { FindOneByEmail } from './find-one-by-email';

describe('FindOneByEmail', () => {
  let provider: FindOneByEmail;
  let userRepository: { findOneBy: jest.Mock };

  beforeEach(() => {
    userRepository = {
      findOneBy: jest.fn(async ({ email }) =>
        email === 'exists@example.com' ? { id: 1, email } : null,
      ),
    };
    provider = new FindOneByEmail(userRepository as any);
  });

  it('returns the user when found', async () => {
    const user = await provider.findOneByEmail('exists@example.com');
    expect(user).toEqual({ id: 1, email: 'exists@example.com' });
    expect(userRepository.findOneBy).toHaveBeenCalledWith({
      email: 'exists@example.com',
    });
  });

  it('throws UnauthorizedException when no user matches', async () => {
    await expect(
      provider.findOneByEmail('ghost@example.com'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws RequestTimeoutException when the database query fails', async () => {
    userRepository.findOneBy.mockRejectedValueOnce(new Error('db down'));

    await expect(
      provider.findOneByEmail('exists@example.com'),
    ).rejects.toBeInstanceOf(RequestTimeoutException);
  });
});
