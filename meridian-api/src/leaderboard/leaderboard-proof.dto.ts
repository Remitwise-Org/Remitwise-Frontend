import { IsInt, IsOptional, IsString, IsPositive, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaderboardProofQueryDto {
  @ApiProperty({ description: 'Participant wallet or on-chain address', example: 'GABC1234...' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({
    description: 'Epoch number (positive integer)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  epoch?: number;
}

export class LeaderboardRankingQueryDto {
  @ApiPropertyOptional({
    description: 'Epoch number to rank (defaults to latest closed epoch)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  epoch?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export interface LeaderboardRankingEntry {
  rank: number;
  address: string;
  totalXp: number;
  claimsSettled: number;
  valuationsProvided: number;
  governanceParticipations: number;
  proof: {
    leaf: string;
    proof: string[];
    root: string;
    verified: boolean;
    leafIndex: number;
  } | null;
  sourceTxHash: string | null;
}

export interface LeaderboardProofResponse {
  address: string;
  epoch: number;
  root: string;
  totalXp: number;
  entries: Array<{
    txHash: string;
    contract: string;
    action: string;
    blockNumber: number;
    xp: number;
    proof: {
      leaf: string;
      proof: string[];
      root: string;
      verified: boolean;
      leafIndex: number;
    } | null;
    rawEvent: Record<string, unknown> | null;
  }>;
}
