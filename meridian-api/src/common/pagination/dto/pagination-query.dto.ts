import { IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Number of results to return per page',
    example: 10,
    default: 2,
  })
  @IsOptional()
  @IsPositive()
  limit?: number = 2;

  @ApiPropertyOptional({
    description: 'Page number of results to fetch',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cursor for keyset pagination (ID of the last item)',
    example: 10,
  })
  @IsOptional()
  @IsPositive()
  cursor?: number;
}
