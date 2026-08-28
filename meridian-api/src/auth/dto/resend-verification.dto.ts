import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email address to resend the verification link to.',
    example: 'john.doe@example.com',
  })
  email: string;
}
