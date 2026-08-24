import { Reflector } from '@nestjs/core';
import { RequireRoles } from './roles.decorator';
import { Role } from '../../enums/role.enum';
import { REQUIRED_ROLES_KEY } from '../../constant/auth-constant';

class FixtureController {
  @RequireRoles(Role.ADMIN)
  single() {}

  @RequireRoles(Role.ADMIN, Role.MODERATOR)
  multiple() {}
}

describe('RequireRoles decorator', () => {
  const reflector = new Reflector();

  it('sets the required-roles metadata to a single role', () => {
    const roles = reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES_KEY, [
      FixtureController.prototype.single,
      FixtureController,
    ]);
    expect(roles).toEqual([Role.ADMIN]);
  });

  it('sets the required-roles metadata to multiple roles', () => {
    const roles = reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES_KEY, [
      FixtureController.prototype.multiple,
      FixtureController,
    ]);
    expect(roles).toEqual([Role.ADMIN, Role.MODERATOR]);
  });

  it('leaves un-decorated handlers without role metadata', () => {
    const roles = reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES_KEY, [
      FixtureController,
      FixtureController,
    ]);
    expect(roles).toBeUndefined();
  });
});
