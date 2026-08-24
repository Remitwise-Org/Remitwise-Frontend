import { Module } from '@nestjs/common';
import { Pagination } from './providers/pagination.provider';

@Module({
  imports: [],
  providers: [Pagination],
  controllers: [],
  exports: [Pagination],
})
export class PaginationModule {}
