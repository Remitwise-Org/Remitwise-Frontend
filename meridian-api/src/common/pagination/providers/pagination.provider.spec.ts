import { Test, TestingModule } from '@nestjs/testing';
import { Pagination } from './pagination.provider';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';

describe('Pagination Provider (Cursor)', () => {
  let provider: Pagination;
  let mockRepository: any;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 10, title: 'Post 10' },
        { id: 9, title: 'Post 9' },
        { id: 8, title: 'Post 8' },
      ]),
      getCount: jest.fn().mockResolvedValue(12),
    };

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Pagination,
        {
          provide: REQUEST,
          useValue: {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            url: '/posts',
          },
        },
      ],
    }).compile();

    provider = module.get<Pagination>(Pagination);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('paginatedCursorQuery', () => {
    it('should load specified relations using leftJoinAndSelect and paginate with cursor', async () => {
      const query = { limit: 2, cursor: 12 };
      const relations = ['tags', 'author', 'metaOptions'];

      const result = await provider.paginatedCursorQuery(
        query,
        mockRepository as Repository<any>,
        relations,
      );

      // Check query builder setup
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('entity');

      // Verify that N+1 is eliminated by loading relations using joins
      for (const rel of relations) {
        expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
          `entity.${rel}`,
          rel,
        );
      }

      // Check cursor where condition (id < cursor for DESC order)
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entity.id < :cursor',
        { cursor: 12 },
      );

      // Check order and limit (+1 to detect more pages)
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'entity.id',
        'DESC',
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(3);

      // Verify query counts: exactly 1 for getMany, 1 for getCount. No N+1!
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.getCount).toHaveBeenCalledTimes(1);

      // Check return format
      expect(result).toEqual({
        data: [
          { id: 10, title: 'Post 10' },
          { id: 9, title: 'Post 9' },
        ],
        nextCursor: 9,
        total: 12,
      });
    });

    it('should handle pagination without cursor and date range filtering', async () => {
      const startDate = new Date('2026-07-01');
      const endDate = new Date('2026-07-18');
      const query = { limit: 5, startDate, endDate };

      mockQueryBuilder.getMany.mockResolvedValue([
        { id: 1, title: 'First Post' },
      ]);

      const result = await provider.paginatedCursorQuery(
        query,
        mockRepository as Repository<any>,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entity.publishedDate >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entity.publishedDate <= :endDate',
        { endDate },
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(6);

      expect(result).toEqual({
        data: [{ id: 1, title: 'First Post' }],
        nextCursor: null,
        total: 12,
      });
    });
  });
});
