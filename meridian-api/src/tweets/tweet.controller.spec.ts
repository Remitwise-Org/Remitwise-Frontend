import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

jest.mock('./dto/tweet.entity', () => ({ Tweet: class Tweet {} }), {
  virtual: true,
});
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock(
  'src/auth/constant/auth-constant',
  () => ({ REQUEST_USER_KEY: 'user', AUTH_TYPE_kEY: 'authType' }),
  { virtual: true },
);

import { TweetController } from './tweet.controller';
import { TweetService } from './tweet.service';

describe('TweetController (integration)', () => {
  let app: INestApplication;
  let tweetService: {
    getAllTweet: jest.Mock;
    createTweet: jest.Mock;
    updateTweet: jest.Mock;
    DeleteTweet: jest.Mock;
  };

  beforeEach(async () => {
    tweetService = {
      getAllTweet: jest.fn(async () => [
        { id: 1, text: 'Hello', user: { id: 7 } },
      ]),
      createTweet: jest.fn(async (dto) => ({ id: 1, ...dto })),
      updateTweet: jest.fn(async (dto) => ({
        id: dto.id,
        text: dto.text ?? 'existing',
      })),
      DeleteTweet: jest.fn(async (id) => ({ deleted: true, id })),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TweetController],
      providers: [{ provide: TweetService, useValue: tweetService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /tweets/:userId delegates to getAllTweet', async () => {
    await request(app.getHttpServer())
      .get('/tweets/7')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([{ id: 1, text: 'Hello', user: { id: 7 } }]);
      });

    expect(tweetService.getAllTweet).toHaveBeenCalledWith(7);
  });

  it('GET /tweets/:userId returns 400 for a non-numeric user id', async () => {
    await request(app.getHttpServer()).get('/tweets/abc').expect(400);
  });

  it('POST /tweets/create-tweet delegates to createTweet', async () => {
    const dto = { text: 'Hello there', userId: 7 };

    await request(app.getHttpServer())
      .post('/tweets/create-tweet')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body.text).toBe('Hello there');
      });

    expect(tweetService.createTweet).toHaveBeenCalledWith(
      expect.objectContaining(dto),
    );
  });

  it('PATCH /tweets/update-tweet delegates to updateTweet', async () => {
    const patch = { id: 1, text: 'Edited' };

    await request(app.getHttpServer())
      .patch('/tweets/update-tweet')
      .send(patch)
      .expect(200)
      .expect((res) => {
        expect(res.body.text).toBe('Edited');
      });

    expect(tweetService.updateTweet).toHaveBeenCalledWith(
      expect.objectContaining(patch),
    );
  });

  it('DELETE /tweets/:id delegates to DeleteTweet', async () => {
    await request(app.getHttpServer())
      .delete('/tweets/3')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ deleted: true, id: 3 });
      });

    expect(tweetService.DeleteTweet).toHaveBeenCalledWith(3);
  });

  it('DELETE /tweets/:id returns 400 for non-numeric ids', async () => {
    await request(app.getHttpServer()).delete('/tweets/abc').expect(400);
  });
});
