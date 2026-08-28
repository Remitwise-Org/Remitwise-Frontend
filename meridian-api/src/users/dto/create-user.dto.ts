import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { Column } from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';

/**
 * Strong-password policy constants defined centrally so any DTO that
 * accepts a user-supplied password shares the same bounds and error
 * strings. Bump these and EVERY reference site (decorator arguments,
 * human-readable messages, @ApiProperty hints) moves in lockstep.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 16;

export const PASSWORD_MAX_LENGTH_MESSAGE = `Password must be at most ${PASSWORD_MAX_LENGTH} characters long. Please choose a shorter password.`;

/**
 * Regex enforcing the strong-password policy described in issue #425.
 *
 * Requires a string that is at least `PASSWORD_MIN_LENGTH` and at most
 * `PASSWORD_MAX_LENGTH` characters long, and contains at least:
 *   - one lowercase letter
 *   - one uppercase letter
 *   - one digit
 *   - one "special" character from the set ! @ # $ % ^ & * ( ) _ + - = [ ] { } ; ' : " \ | , . < > / ? ` ~
 *
 * The trailing `.{8,16}` is a redundant belt-and-suspenders length anchor
 * mirroring the `@MinLength` / `@MaxLength` decorators — keep the literal
 * bounds in sync with `PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH` if you
 * ever change either of them.
 */
export const PASSWORD_STRENGTH_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,16}$/;

export const PASSWORD_STRENGTH_MESSAGE = `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character (!@#$%^&*()_+-=[]{};\\':"\\|,.<>/?\`~).`;

export class CreateUserDto {
  @Column()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  firstName: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  lastName: string;

  @Column()
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH, { message: PASSWORD_MAX_LENGTH_MESSAGE })
  @Matches(PASSWORD_STRENGTH_REGEX, {
    message: PASSWORD_STRENGTH_MESSAGE,
  })
  @ApiProperty({
    description: `Password of the user. Must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.`,
    example: 'Password123!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  password: string;
}
