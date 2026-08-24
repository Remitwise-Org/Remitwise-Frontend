import { IsString, IsOptional, IsUrl, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookRegistrationDto {
  @ApiProperty({ description: 'Callback URL to receive webhook events' })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({ description: 'Filter by contract name' })
  @IsOptional()
  @IsString()
  contract?: string;

  @ApiPropertyOptional({ description: 'Filter by contract action' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by on-chain address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Secret used for HMAC signature',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  generateSecret?: boolean;
}
