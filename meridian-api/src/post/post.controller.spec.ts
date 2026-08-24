import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

jest.mock('../post/post.entity', () => ({ Post: class Post {} }));
jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock('src/tag/tag.entity', () => ({ Tag: class Tag {} }), {
  virtual: true,
});
jest.mock('src/metaoption/metaoption.entity', () => ({}), { virtual: true });
jest.mock('src/metaoption/dto/create-post-meta-options.dto', () => ({}), {
  virtual: true,
});
jest.mock('src/metaoption/dto/update-post-meta-options.dto', () => ({}), {
  virtual: true,
});
jest.mock('src/metaoption/metaoption.controller', () => ({}), {
  virtual: true,
});
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock(
  './provider/post.service',
  () => ({ PostsService: class PostsService {} }),
  { virtual: true },
);
jest.mock(
  '../dto/post-param.dto',
  () => ({ GetPostsParamDto: class GetPostsParamDto {} }),
  { virtual: true },
);
jest.mock(
  '../dto/create-post.dto',
  () => ({ CreatePostDto: class CreatePostDto {} }),
  { virtual: true },
);
jest.mock(
  '../dto/patch-post.dto',
  () => ({ PatchPostDto: class PatchPostDto {} }),
  { virtual: true },
);
jest.mock(
  '../dto/get-posts.dto',
  () => ({ GetPostsDto: class GetPostsDto {} }),
  { virtual: true },
);
jest.mock(
  'src/tag/tags.service',
  () => ({ TagsService: class TagsService {} }),
  {
    virtual: true,
  },
);
jest.mock(
  'src/common/pagination/providers/pagination.provider',
  () => ({ Pagination: class Pagination {} }),
  { virtual: true },
);
jest.mock(
  'src/common/pagination/interfaces/paginated.interface',
  () => ({ Paginated: class Paginated {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/constant/auth-constant',
  () => ({ REQUEST_USER_KEY: 'user', AUTH_TYPE_kEY: 'authType' }),
  { virtual: true },
);
jest.mock('src/DTO/postparamdto', () => ({}), { virtual: true });
jest.mock('src/DTO/create-post.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/patch-post.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/getPostdto', () => ({}), { virtual: true });
jest.mock('src/common/pagination/dto/pagination-query.dto', () => ({}), {
  virtual: true,
});

import { PostController } from './post.controller';
import { PostsService } from './provider/post.service';

describe('PostController (integration)', () => {
  let app: INestApplication;
  let postsService: {
    FindAllposts: jest.Mock;
    createPost: jest.Mock;
    deleteOne: jest.Mock;
    UpdatePost: jest.Mock;
  };

  beforeEach(async () => {
    postsService = {
      FindAllposts: jest.fn(async () => ({
        data: [{ id: 1, title: 'Hello' }],
        nextCursor: null,
        total: 1,
      })),
      createPost: jest.fn(async (dto) => ({ id: 1, ...dto })),
      deleteOne: jest.fn(async (id) => ({ deleted: true, id })),
      UpdatePost: jest.fn(async (dto) => ({ id: dto.id, ...dto })),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [{ provide: PostsService, useValue: postsService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /posts delegates to FindAllposts', async () => {
    await request(app.getHttpServer())
      .get('/posts')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toHaveLength(1);
      });

    expect(postsService.FindAllposts).toHaveBeenCalled();
  });

  it('POST /posts delegates to createPost', async () => {
    const dto = {
      title: 'Hello',
      content: 'World',
      authorId: 1,
      tags: [1],
    };

    await request(app.getHttpServer())
      .post('/posts')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body.title).toBe('Hello');
      });

    expect(postsService.createPost).toHaveBeenCalledWith(
      expect.objectContaining(dto),
    );
  });

  it('DELETE /posts?id=N delegates to deleteOne', async () => {
    await request(app.getHttpServer())
      .delete('/posts?id=7')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ deleted: true, id: 7 });
      });

    expect(postsService.deleteOne).toHaveBeenCalledWith(7);
  });

  it('DELETE /posts returns 400 when id is not numeric', async () => {
    await request(app.getHttpServer()).delete('/posts?id=abc').expect(400);
  });

  it('PATCH /posts delegates to UpdatePost', async () => {
    const dto = { id: 1, title: 'Updated' };

    await request(app.getHttpServer())
      .patch('/posts')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(1);
      });

    expect(postsService.UpdatePost).toHaveBeenCalledWith(
      expect.objectContaining(dto),
    );
  });
});
