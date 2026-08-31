import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Maximum email length (RFC 5321 §4.5.3.1). */
const MAX_EMAIL_LENGTH = 254;

/** Maximum password length — bcrypt silently truncates at 72 bytes. */
const MAX_PASSWORD_LENGTH = 72;

export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(MAX_EMAIL_LENGTH)
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    maxLength: MAX_EMAIL_LENGTH,
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(MAX_PASSWORD_LENGTH)
  @ApiProperty({
    description: 'Password of the user',
    example: 'Password123!',
    maxLength: MAX_PASSWORD_LENGTH,
  })
  password: string;
}
