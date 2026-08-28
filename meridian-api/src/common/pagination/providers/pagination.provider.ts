import { Inject, Injectable, Logger } from '@nestjs/common';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { ObjectLiteral, Repository } from 'typeorm';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { Paginated } from '../interfaces/paginated.interface';

@Injectable()
export class Pagination {
  private readonly logger = new Logger(Pagination.name);

  constructor(
    @Inject(REQUEST)
    private readonly request: Request,
  ) {}

  public async paginatedQuery<T extends ObjectLiteral>(
    paginationQueryDto: PaginationQueryDto,
    repository: Repository<T>,
  ): Promise<Paginated<T>> {
    const result = await repository.find({
      skip: paginationQueryDto.limit * (paginationQueryDto.page - 1),
      take: paginationQueryDto.limit,
    });

    const baseUrl =
      this.request.protocol + '://' + this.request.headers.host + '/';

    const newUrl = new URL(this.request.url, baseUrl);

    this.logger.debug(
      JSON.stringify({ msg: 'pagination.urls', baseUrl, href: newUrl.href }),
    );

    const totalItems = await repository.count();

    const totalpage = Math.ceil(totalItems / paginationQueryDto.limit);

    const nextpage =
      paginationQueryDto.page === 1
        ? paginationQueryDto.page
        : paginationQueryDto.page + 1;

    const prevpage =
      paginationQueryDto.page === 1
        ? paginationQueryDto.page
        : paginationQueryDto.page - 1;

    const finalResponse: Paginated<T> = {
      data: result,
      meta: {
        itemsPerPage: paginationQueryDto.limit,
        totalItems: totalItems,
        currentPage: paginationQueryDto.page,
        totalPage: totalpage,
      },
      link: {
        first: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=1`,

        last: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&${totalpage}`,

        current: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=${paginationQueryDto.page}`,

        next: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=${nextpage}`,

        previous: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=${prevpage}`,
      },
    };

    return finalResponse;
  }

  public async paginatedCursorQuery<T extends ObjectLiteral>(
    query: {
      limit?: number;
      cursor?: number;
      startDate?: Date;
      endDate?: Date;
    },
    repository: Repository<T>,
    relations: string[] = [],
  ): Promise<{ data: T[]; nextCursor: number | null; total: number }> {
    const limit = query.limit || 10;
    const { cursor, startDate, endDate } = query;

    const queryBuilder = repository.createQueryBuilder('entity');

    for (const rel of relations) {
      queryBuilder.leftJoinAndSelect(`entity.${rel}`, rel);
    }

    queryBuilder.orderBy('entity.id', 'DESC');

    if (cursor) {
      queryBuilder.andWhere('entity.id < :cursor', { cursor });
    }

    if (startDate) {
      queryBuilder.andWhere('entity.publishedDate >= :startDate', {
        startDate,
      });
    }
    if (endDate) {
      queryBuilder.andWhere('entity.publishedDate <= :endDate', { endDate });
    }

    queryBuilder.take(limit + 1);

    const data = await queryBuilder.getMany();

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? (items[items.length - 1] as any).id : null;

    const countBuilder = repository.createQueryBuilder('entity');
    if (startDate) {
      countBuilder.andWhere('entity.publishedDate >= :startDate', {
        startDate,
      });
    }
    if (endDate) {
      countBuilder.andWhere('entity.publishedDate <= :endDate', { endDate });
    }
    const total = await countBuilder.getCount();

    return {
      data: items,
      nextCursor,
      total,
    };
  }
}
