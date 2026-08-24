jest.mock('../user.entity', () => ({ User: class User {} }));
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
jest.mock('src/DTO/create-user.dto', () => ({}), { virtual: true });

import { BadRequestException, RequestTimeoutException } from '@nestjs/common';
import { CreateUserProvider } from './create-user.provider';

describe('CreateUserProvider', () => {
  let provider: CreateUserProvider;
  let userRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let hashingProvider: { hashPassword: jest.Mock };
  let mailService: { WelcomeEmail: jest.Mock };
  let cryptoProvider: {
    isEnabled: jest.Mock;
    createDek: jest.Mock;
    attachDekToUser: jest.Mock;
    encrypt: jest.Mock;
    decrypt: jest.Mock;
  };

  const dto: any = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'plain-password',
  };

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        id: 1,
        ...entity,
      })),
    };
    hashingProvider = { hashPassword: jest.fn(async () => 'hashed-password') };
    mailService = { WelcomeEmail: jest.fn(async () => undefined) };
    cryptoProvider = {
      isEnabled: jest.fn(() => false),
      createDek: jest.fn(async () => ({ id: 'dek-1' })),
      attachDekToUser: jest.fn(async () => undefined),
      encrypt: jest.fn(async () => ({ ciphertext: 'env', dekId: 'dek-1' })),
      decrypt: jest.fn(async () => 'plain'),
    };

    provider = new CreateUserProvider(
      userRepository as any,
      hashingProvider as any,
      mailService as any,
      cryptoProvider as any,
    );
  });

  it('hashes the password, persists the user, and sends a welcome email', async () => {
    const result = await provider.createUsers(dto);

    expect(hashingProvider.hashPassword).toHaveBeenCalledWith('plain-password');
    expect(userRepository.create).toHaveBeenCalledWith({
      ...dto,
      password: 'hashed-password',
      dataEncryptionKeyId: null,
    });
    expect(cryptoProvider.createDek).not.toHaveBeenCalled();
    expect(cryptoProvider.attachDekToUser).not.toHaveBeenCalled();
    expect(userRepository.save).toHaveBeenCalled();
    expect(mailService.WelcomeEmail).toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        email: dto.email,
        password: 'hashed-password',
      }),
    ]);
  });

  it('throws BadRequestException when the email is already taken', async () => {
    userRepository.findOne.mockResolvedValueOnce({ id: 9, email: dto.email });

    await expect(provider.createUsers(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('throws RequestTimeoutException when the lookup query fails', async () => {
    userRepository.findOne.mockRejectedValueOnce(new Error('connection lost'));

    await expect(provider.createUsers(dto)).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
  });

  it('throws RequestTimeoutException when saving the new user fails', async () => {
    userRepository.save.mockRejectedValueOnce(new Error('write failed'));

    await expect(provider.createUsers(dto)).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
  });

  it('provisions and links a DEK when envelope encryption is enabled (issue #631)', async () => {
    cryptoProvider.isEnabled.mockReturnValue(true);
    cryptoProvider.createDek.mockResolvedValueOnce({ id: 'dek-1' });
    userRepository.save.mockResolvedValueOnce({ id: 1, email: dto.email });

    const result = await provider.createUsers(dto);

    expect(cryptoProvider.createDek).toHaveBeenCalled();
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ dataEncryptionKeyId: 'dek-1' }),
    );
    expect(cryptoProvider.attachDekToUser).toHaveBeenCalledWith('dek-1', 1);
    expect(result).toHaveLength(1);
  });

  it('still returns the user when sending the welcome email fails', async () => {
    mailService.WelcomeEmail.mockRejectedValueOnce(new Error('smtp down'));

    const result = await provider.createUsers(dto);
    expect(mailService.WelcomeEmail).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
