import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Maximum email length (RFC 5321 §4.5.3.1). */
const MAX_EMAIL_LENGTH = 254;

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(MAX_EMAIL_LENGTH)
  @ApiProperty({
    description: 'Email address to resend the verification link to.',
    example: 'john.doe@example.com',
    maxLength: MAX_EMAIL_LENGTH,
  })
  email: string;
}
