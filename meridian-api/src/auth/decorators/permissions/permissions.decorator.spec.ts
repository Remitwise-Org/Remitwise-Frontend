import { Reflector } from '@nestjs/core';
import { RequirePermissions } from './permissions.decorator';
import { Permission } from '../../enums/permission.enum';
import { REQUIRED_PERMISSIONS_KEY } from '../../constant/auth-constant';

class FixtureController {
  @RequirePermissions(Permission.AUDIT_READ)
  single() {}

  @RequirePermissions(Permission.USERS_READ, Permission.USERS_UPDATE)
  multiple() {}
}

describe('RequirePermissions decorator', () => {
  const reflector = new Reflector();

  it('sets the required-permissions metadata to a single permission', () => {
    const permissions = reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [FixtureController.prototype.single, FixtureController],
    );
    expect(permissions).toEqual([Permission.AUDIT_READ]);
  });

  it('sets the required-permissions metadata to multiple permissions', () => {
    const permissions = reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [FixtureController.prototype.multiple, FixtureController],
    );
    expect(permissions).toEqual([
      Permission.USERS_READ,
      Permission.USERS_UPDATE,
    ]);
  });
});
