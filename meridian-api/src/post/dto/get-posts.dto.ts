import { IntersectionType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';

class GetPostsBaseDto {
  @ApiPropertyOptional({
    description: 'Filter posts created on or after this date',
    example: '2026-06-17T00:00:00.000Z',
  })
  @IsISO8601()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter posts created on or before this date',
    example: '2026-06-17T23:59:59.000Z',
  })
  @IsISO8601()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}

export class GetPostsDto extends IntersectionType(
  GetPostsBaseDto,
  PaginationQueryDto,
) {}
