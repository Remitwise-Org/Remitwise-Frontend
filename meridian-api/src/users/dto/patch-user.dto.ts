import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PartialType, ApiProperty } from '@nestjs/swagger';
import {
  CreateUserDto,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MAX_LENGTH_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_MESSAGE,
  PASSWORD_STRENGTH_REGEX,
} from './create-user.dto';

/**
 * PATCH /users payload.
 *
 * Note: `@nestjs/swagger` `PartialType` only adds `@IsOptional` and Swagger
 * metadata — it does NOT propagate the original `CreateUserDto` validators.
 * For that reason the `password` field is RE-DECLARED below with the same
 * strength policy as `CreateUserDto`, so password updates via PATCH /users
 * can't be used to bypass issue #425.
 */
export class EditUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: 'The ID of the user to edit', example: 1 })
  @IsInt()
  @IsNotEmpty()
  id: number;

  @ApiProperty({
    description: `Optional new password. When provided, the same ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} character policy with one uppercase letter, one lowercase letter, one digit, and one special character applies as on user creation.`,
    example: 'Password1!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH, { message: PASSWORD_MAX_LENGTH_MESSAGE })
  @Matches(PASSWORD_STRENGTH_REGEX, {
    message: PASSWORD_STRENGTH_MESSAGE,
  })
  password?: string;
}
