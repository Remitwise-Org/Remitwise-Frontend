import { IsOptional, IsString, IsPositive, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '../../audit/audit-log.entity';

export class AuditQueryDto {
  @ApiPropertyOptional({
    description: 'Cursor for pagination (id from last item)',
  })
  @IsOptional()
  @IsPositive()
  cursor?: number;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    default: 20,
  })
  @IsOptional()
  @IsPositive()
  limit?: number = 20;

  @ApiPropertyOptional({
    description:
      'Filter by contract name (e.g. escrow, governance, oracle, risk_pool)',
  })
  @IsOptional()
  @IsString()
  contract?: string;

  @ApiPropertyOptional({
    description:
      'Filter by contract action (e.g. created, funded, released, signed)',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Filter by audit action type',
    enum: AuditAction,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  auditAction?: AuditAction;
}
