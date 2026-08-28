import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TweetService } from './tweet.service';
import { Tweet } from './entities/tweet.entity';
import { UserService } from 'src/users/providers/user.services';
import { NotFoundException } from '@nestjs/common';

describe('TweetService', () => {
  let service: TweetService;
  let tweetRepository: any;
  let userService: any;

  beforeEach(async () => {
    tweetRepository = {
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((tweet) => Promise.resolve({ id: 1, ...tweet })),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };

    userService = {
      findOneById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TweetService,
        {
          provide: getRepositoryToken(Tweet),
          useValue: tweetRepository,
        },
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    service = module.get<TweetService>(TweetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllTweet', () => {
    it('should return tweets if user exists', async () => {
      const tweets = [{ id: 1, text: 'Hello' }];
      userService.findOneById.mockResolvedValue({ id: 7 });
      tweetRepository.find.mockResolvedValue(tweets);

      const result = await service.getAllTweet(7);
      expect(result).toEqual(tweets);
      expect(userService.findOneById).toHaveBeenCalledWith(7);
      expect(tweetRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 7 } },
      });
    });

    it('should throw NotFoundException if user is not found', async () => {
      userService.findOneById.mockResolvedValue(null);

      await expect(service.getAllTweet(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTweet', () => {
    it('should create and save a new tweet', async () => {
      const dto = { text: 'New tweet', userId: 7 };
      userService.findOneById.mockResolvedValue({ id: 7 });

      const result = await service.createTweet(dto);
      expect(result).toBeDefined();
      expect(tweetRepository.create).toHaveBeenCalled();
      expect(tweetRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateTweet', () => {
    it('should update and save the tweet if found', async () => {
      const existing = { id: 1, text: 'Old', image: 'old.png' };
      tweetRepository.findOneBy.mockResolvedValue(existing);

      const result = await service.updateTweet({ id: 1, text: 'New' });
      expect(result).toBeDefined();
      expect(tweetRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'New', image: 'old.png' }),
      );
    });

    it('should throw NotFoundException if tweet to update is not found', async () => {
      tweetRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateTweet({ id: 99, text: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DeleteTweet', () => {
    it('should delete and return deletion info', async () => {
      tweetRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.DeleteTweet(1);
      expect(result).toEqual({ deleted: true, id: 1 });
      expect(tweetRepository.delete).toHaveBeenCalledWith({ id: 1 });
    });
  });
});
