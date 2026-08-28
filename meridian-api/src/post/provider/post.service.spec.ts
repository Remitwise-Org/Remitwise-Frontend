// Mock entities and aliased paths that Jest cannot resolve.
jest.mock('../post.entity', () => ({ Post: class Post {} }));
jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock('src/tag/tag.entity', () => ({ Tag: class Tag {} }), {
  virtual: true,
});
jest.mock('src/metaoption/metaoption.entity', () => ({}), {
  virtual: true,
});
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
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

import { PostsService } from './post.service';

const mockAuthor = { id: 1, firstName: 'Jane', lastName: 'Doe' };
const mockTags = [
  { id: 1, name: 'nestjs' },
  { id: 2, name: 'typescript' },
];
const mockPost = {
  id: 10,
  title: 'Hello',
  content: 'World',
  author: mockAuthor,
  tags: mockTags,
};

function makeQueryRunner(managerOverrides: Record<string, jest.Mock> = {}) {
  const manager: Record<string, jest.Mock> = {
    create: jest.fn((_, dto) => ({ id: 10, ...dto })),
    save: jest.fn(async (_, post) => post),
    findOneBy: jest.fn(async () => ({ ...mockPost })),
    ...managerOverrides,
  };
  return {
    runner: {
      connect: jest.fn(async () => undefined),
      startTransaction: jest.fn(async () => undefined),
      commitTransaction: jest.fn(async () => undefined),
      rollbackTransaction: jest.fn(async () => undefined),
      release: jest.fn(async () => undefined),
      manager,
    },
    manager,
  };
}

describe('PostsService', () => {
  let service: PostsService;
  let postRepository: {
    softDelete: jest.Mock;
    restore: jest.Mock;
  };
  let userService: { findOneId: jest.Mock };
  let tagService: { findMultiTag: jest.Mock };
  let paginationService: { paginatedCursorQuery: jest.Mock };
  let dataSource: { createQueryRunner: jest.Mock };
  let currentQueryRunner: ReturnType<typeof makeQueryRunner>['runner'];

  beforeEach(() => {
    const { runner } = makeQueryRunner();
    currentQueryRunner = runner;

    postRepository = {
      softDelete: jest.fn(async () => ({ affected: 1 })),
      restore: jest.fn(async () => ({ affected: 1 })),
    };
    userService = { findOneId: jest.fn(async () => mockAuthor) };
    tagService = { findMultiTag: jest.fn(async () => mockTags) };
    paginationService = {
      paginatedCursorQuery: jest.fn(async () => ({
        data: [mockPost],
        nextCursor: null,
        total: 1,
      })),
    };
    dataSource = { createQueryRunner: jest.fn(() => currentQueryRunner) };

    service = new PostsService(
      postRepository as any,
      userService as any,
      tagService as any,
      paginationService as any,
      dataSource as any,
    );
  });

  describe('FindAllposts', () => {
    it('delegates to the pagination service and returns paginated results', async () => {
      const query = {
        limit: 10,
        cursor: 5,
        startDate: undefined,
        endDate: undefined,
      } as any;
      const result = await service.FindAllposts(query);

      expect(paginationService.paginatedCursorQuery).toHaveBeenCalledWith(
        { limit: 10, cursor: 5, startDate: undefined, endDate: undefined },
        postRepository,
        ['tags', 'author', 'metaOptions'],
      );
      expect(result).toEqual({
        data: [mockPost],
        nextCursor: null,
        total: 1,
      });
    });
  });

  describe('deleteOne', () => {
    it('soft-deletes a post by id and returns the deletion summary', async () => {
      const result = await service.deleteOne(10);
      expect(postRepository.softDelete).toHaveBeenCalledWith(10);
      expect(result).toEqual({ deleted: true, id: 10 });
    });
  });

  describe('createPost', () => {
    it('opens a transaction, resolves author + tags, persists the post, and commits', async () => {
      const dto = {
        title: 'Hello',
        content: 'World',
        authorId: 1,
        tags: [1, 2],
      } as any;

      const result = await service.createPost(dto);

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(currentQueryRunner.connect).toHaveBeenCalled();
      expect(currentQueryRunner.startTransaction).toHaveBeenCalled();
      expect(userService.findOneId).toHaveBeenCalledWith(1);
      expect(tagService.findMultiTag).toHaveBeenCalledWith([1, 2]);
      expect(currentQueryRunner.manager.create).toHaveBeenCalled();
      expect(currentQueryRunner.manager.save).toHaveBeenCalled();
      expect(currentQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(currentQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(currentQueryRunner.release).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('rolls back and rethrows when the manager save fails', async () => {
      currentQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('disk full'),
      );

      await expect(
        service.createPost({ authorId: 1, tags: [] } as any),
      ).rejects.toThrow('disk full');

      expect(currentQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(currentQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(currentQueryRunner.release).toHaveBeenCalled();
    });

    it('rolls back and rethrows when userService.findOneId throws', async () => {
      userService.findOneId.mockRejectedValueOnce(
        new Error('author not found'),
      );

      await expect(
        service.createPost({ authorId: 99, tags: [] } as any),
      ).rejects.toThrow('author not found');

      expect(currentQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(currentQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('UpdatePost', () => {
    it('opens a transaction, patches the post, saves, and commits', async () => {
      const patch = {
        id: 10,
        title: 'New title',
        content: 'New content',
        PostStatus: 'review',
      } as any;

      const result = await service.UpdatePost(patch);

      expect(currentQueryRunner.startTransaction).toHaveBeenCalled();
      expect(tagService.findMultiTag).toHaveBeenCalledWith(patch.tags);
      expect(currentQueryRunner.manager.findOneBy).toHaveBeenCalled();
      expect(currentQueryRunner.manager.save).toHaveBeenCalled();
      expect(currentQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(currentQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('rolls back and rethrows when the manager save fails during update', async () => {
      currentQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('constraint violation'),
      );

      await expect(
        service.UpdatePost({ id: 10, tags: [] } as any),
      ).rejects.toThrow('constraint violation');

      expect(currentQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(currentQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(currentQueryRunner.release).toHaveBeenCalled();
    });

    it('keeps existing field values when the patch omits them', async () => {
      const existing = {
        id: 10,
        title: 'Same',
        content: 'Same',
        imageUrl: 'img.png',
        postType: 'post',
        postStatus: 'draft',
        tags: [],
      };
      currentQueryRunner.manager.findOneBy.mockResolvedValueOnce({
        ...existing,
      });
      currentQueryRunner.manager.save.mockImplementationOnce(
        async (_, post) => post,
      );

      const result = await service.UpdatePost({ id: 10, tags: [] } as any);

      expect(result.title).toBe('Same');
      expect(result.imageUrl).toBe('img.png');
    });
  });
});
