import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** JWT tokens are typically < 2 KB; 4 KB covers RSA-4096 with generous claims. */
const MAX_REFRESH_TOKEN_LENGTH = 4096;

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The JWT refresh token issued during login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(MAX_REFRESH_TOKEN_LENGTH)
  refreshToken: string;
}
