import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Verification tokens are 64-char hex; cap at 256 to reject oversized payloads. */
const MAX_TOKEN_LENGTH = 256;

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  @MaxLength(MAX_TOKEN_LENGTH)
  @ApiProperty({
    description:
      'Raw verification token delivered in the signup email. 32-byte hex string.',
    example:
      '9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
    maxLength: MAX_TOKEN_LENGTH,
  })
  token: string;
}
