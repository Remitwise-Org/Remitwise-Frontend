import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from 'src/auth/enums/role.enum';

/**
 * Payload for the admin-only role-assignment endpoint
 * `POST /users/:id/role` (issue #632).
 */
export class AssignRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.MODERATOR,
    description: 'The role to assign to the user',
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
