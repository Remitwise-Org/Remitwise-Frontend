import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Permission } from 'src/auth/enums/permission.enum';

/**
 * Query params for the admin-only permission lookup endpoint
 * `GET /users/:id/permissions` (issue #632). The `permission` filter narrows
 * the returned list to a single permission (e.g. to answer "does this user
 * have X?").
 */
export class UserPermissionQueryDto {
  @ApiPropertyOptional({
    enum: Permission,
    description: 'Optional filter — return only this permission if held',
  })
  @IsOptional()
  @IsEnum(Permission)
  permission?: Permission;
}
