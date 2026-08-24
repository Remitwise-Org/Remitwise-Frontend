import { Reflector } from '@nestjs/core';
import { UsersController } from '../../../users/users.controller';
import { PostController } from '../../../post/post.controller';
import { UploadController } from '../../../upload/upload.controller';
import { LeaderboardController } from '../../../leaderboard/leaderboard-proof.controller';
import { AuditController } from '../../../events/audit.controller';
import { Role } from '../../enums/role.enum';
import { Permission } from '../../enums/permission.enum';
import {
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY,
} from '../../constant/auth-constant';

// Service modules are mocked so importing the real controllers does not drag
// in the whole dependency graph; we only assert on handler metadata here.

jest.mock('../../../users/providers/user.services', () => ({
  UserService: class UserService {},
}));
jest.mock('../../../post/provider/post.service', () => ({
  PostsService: class PostsService {},
}));
jest.mock('../../../upload/upload.service', () => ({
  UploadService: class UploadService {},
  MAX_FILE_SIZE: 5 * 1024 * 1024,
}));
jest.mock('../../../leaderboard/leaderboard-proof.service', () => ({
  LeaderboardProofService: class LeaderboardProofService {},
}));
jest.mock('../../../events/events.service', () => ({
  EventsService: class EventsService {},
}));

describe('Protected endpoints (issue #632)', () => {
  const reflector = new Reflector();

  const rolesOf = (
    controller: object,
    handler: string,
  ): Role[] | undefined =>
    reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES_KEY, [
      controller[handler as keyof typeof controller],
      controller.constructor,
    ]);

  const permissionsOf = (
    controller: object,
    handler: string,
  ): Permission[] | undefined =>
    reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
      controller[handler as keyof typeof controller],
      controller.constructor,
    ]);

  const isPublic = (controller: object, handler: string): boolean =>
    reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      controller[handler as keyof typeof controller],
      controller.constructor,
    ]) === true;

  describe('POST /users', () => {
    it('requires moderator or admin role', () => {
      const users = UsersController.prototype;
      expect(rolesOf(users, 'createUsers')).toEqual([
        Role.MODERATOR,
        Role.ADMIN,
      ]);
    });
  });

  describe('DELETE /users/:id', () => {
    it('requires the admin role', () => {
      const users = UsersController.prototype;
      expect(rolesOf(users, 'deleteUsers')).toEqual([Role.ADMIN]);
    });
  });

  describe('POST /users/:id/role (new admin endpoint)', () => {
    it('requires the users:manage-roles permission', () => {
      const users = UsersController.prototype;
      expect(permissionsOf(users, 'assignRole')).toEqual([
        Permission.USERS_MANAGE_ROLES,
      ]);
    });
  });

  describe('GET /users/:id/permissions (new admin endpoint)', () => {
    it('requires the admin role', () => {
      const users = UsersController.prototype;
      expect(rolesOf(users, 'getUserPermissions')).toEqual([Role.ADMIN]);
    });
  });

  describe('GET /users', () => {
    it('requires users:read permission', () => {
      const users = UsersController.prototype;
      expect(permissionsOf(users, 'getUsers')).toEqual([
        Permission.USERS_READ,
      ]);
    });
  });

  describe('POST /posts', () => {
    it('requires posts:create permission (authenticated)', () => {
      const posts = PostController.prototype;
      expect(permissionsOf(posts, 'Createpost')).toEqual([
        Permission.POSTS_CREATE,
      ]);
    });
  });

  describe('POST /upload', () => {
    it('requires upload:create permission (authenticated)', () => {
      const upload = UploadController.prototype;
      expect(permissionsOf(upload, 'uploadFile')).toEqual([
        Permission.UPLOAD_CREATE,
      ]);
    });
  });

  describe('GET /leaderboard', () => {
    it('is public (no auth)', () => {
      const leaderboard = LeaderboardController.prototype;
      expect(isPublic(leaderboard, 'getLeaderboard')).toBe(true);
      expect(isPublic(leaderboard, 'getProof')).toBe(true);
    });
  });

  describe('GET /audit', () => {
    it('requires the admin role on the whole controller', () => {
      const audit = AuditController.prototype;
      expect(rolesOf(audit, 'findAll')).toEqual([Role.ADMIN]);
      expect(rolesOf(audit, 'stats')).toEqual([Role.ADMIN]);
      expect(rolesOf(audit, 'verifyChain')).toEqual([Role.ADMIN]);
      expect(rolesOf(audit, 'findByTxHash')).toEqual([Role.ADMIN]);
    });
  });
});
