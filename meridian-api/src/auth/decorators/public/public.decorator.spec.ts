import { Reflector } from '@nestjs/core';
import { Public } from './public.decorator';
import { IS_PUBLIC_KEY } from '../../constant/auth-constant';

class FixtureController {
  @Public()
  publicRoute() {}

  privateRoute() {}
}

describe('Public decorator', () => {
  const reflector = new Reflector();

  it('marks a handler as public', () => {
    const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      FixtureController.prototype.publicRoute,
      FixtureController,
    ]);
    expect(isPublic).toBe(true);
  });

  it('leaves un-decorated handlers without public metadata', () => {
    const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      FixtureController.prototype.privateRoute,
      FixtureController,
    ]);
    expect(isPublic).toBeUndefined();
  });
});
