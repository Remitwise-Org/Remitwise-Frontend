import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** JWT tokens are typically < 2 KB; 4 KB covers RSA-4096 with generous claims. */
const MAX_REFRESH_TOKEN_LENGTH = 4096;

export class LogoutDto {
  @ApiProperty({
    description: 'The refresh token to revoke',
    example: 'eyJ...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(MAX_REFRESH_TOKEN_LENGTH)
  refreshToken: string;
}
