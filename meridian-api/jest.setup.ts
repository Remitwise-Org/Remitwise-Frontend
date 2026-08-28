// Global jest setup: registers virtual mocks for every aliased or relative
// import path that the meridian-api specs need to short-circuit.
// These mocks are registered BEFORE any spec file is loaded, so transitive
// chains (e.g. users.controller -> UserService -> user.entity -> post.entity)
// never reach the real source files.
//
// Idempotent with per-spec mocks; pairs of identical (path, factory) calls are
// fine since jest.mock re-registration is a no-op.

// Most-important-stub: replace IntersectionType from @nestjs/swagger so DTOs
// that compose with it (e.g. post/dto/get-posts.dto) don't crash at class
// load time when their dependency DTOs aren't reachable from jest.
jest.mock('@nestjs/swagger', () => {
  const actual = jest.requireActual('@nestjs/swagger');
  return {
    ...actual,
    IntersectionType: (..._classes: unknown[]) => class IntersectionType {},
  };
});

// ----- Auth module constants & DTOs -----
jest.mock(
  'src/auth/constant/auth-constant',
  () => ({
    REQUEST_USER_KEY: 'user',
    AUTH_TYPE_kEY: 'authType',
    IS_PUBLIC_KEY: 'isPublic',
    REQUIRED_ROLES_KEY: 'requiredRoles',
    REQUIRED_PERMISSIONS_KEY: 'requiredPermissions',
  }),
  { virtual: true },
);
jest.mock(
  'src/auth/enums/auth-type.enum',
  () => ({ AuthType: { Bearer: 0, None: 1 } }),
  { virtual: true },
);
jest.mock(
  'src/auth/decorators/auth/auth.decorator',
  () => ({
    Auth:
      (..._args: unknown[]) =>
      (
        target: unknown,
        _key?: string | symbol,
        descriptor?: PropertyDescriptor,
      ) =>
        descriptor ?? target,
  }),
  { virtual: true },
);
jest.mock(
  'src/auth/config/jwt.config',
  () => ({
    default: {
      KEY: 'jwt',
      secret: '',
      audience: '',
      issuer: '',
      ttl: 360,
      Rttl: 7776000,
    },
  }),
  { virtual: true },
);

// ----- Auth providers (idempotent stubs; per-spec files override as needed) -----
jest.mock(
  'src/auth/providers/hashing',
  () => ({ HashingProvider: class HashingProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/providers/sign-in.providers',
  () => ({ SignInProviders: class SignInProviders {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/providers/token.provider',
  () => ({ GenerateTokenProvider: class GenerateTokenProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/providers/refreshToken.provider',
  () => ({ RefreshTokenProvider: class RefreshTokenProvider {} }),
  { virtual: true },
);

// ----- Mail + common error -----
jest.mock(
  'src/mail/providers/mail.provider',
  () => ({ MailProvider: class MailProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/commom/userAlreadyExistException',
  () => ({ UserAlreadyExistException: class UserAlreadyExistException {} }),
  { virtual: true },
);
jest.mock(
  'src/common/exceptions/user-already-exists.exception',
  () => ({ UserAlreadyExistException: class UserAlreadyExistException {} }),
  { virtual: true },
);

// ----- Entities (aliased paths) -----
jest.mock(
  'src/users/user.entity',
  () => ({ User: class User {} }),
  { virtual: true },
);
jest.mock(
  'src/post/post.entity',
  () => ({ Post: class Post {} }),
  { virtual: true },
);
jest.mock(
  'src/tweets/dto/tweet.entity',
  () => ({ Tweet: class Tweet {} }),
  { virtual: true },
);
jest.mock(
  'src/tweets/entities/tweet.entity',
  () => ({ Tweet: class Tweet {} }),
  { virtual: true },
);
jest.mock(
  'src/tag/tag.entity',
  () => ({ Tag: class Tag {} }),
  { virtual: true },
);
jest.mock(
  'src/metaoption/metaoption.entity',
  () => ({}),
  { virtual: true },
);
jest.mock(
  'src/metaoption/dto/create-post-meta-options.dto',
  () => ({}),
  { virtual: true },
);
jest.mock(
  'src/metaoption/dto/update-post-meta-options.dto',
  () => ({}),
  { virtual: true },
);
jest.mock(
  'src/metaoption/metaoption.controller',
  () => ({}),
  { virtual: true },
);

// ----- Services referenced through aliased paths -----
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock(
  'src/users/providers/user-auth.facade',
  () => ({ UserAuthFacade: class UserAuthFacade {} }),
  { virtual: true },
);
jest.mock(
  'src/tag/tags.service',
  () => ({ TagsService: class TagsService {} }),
  { virtual: true },
);
jest.mock(
  'src/post/provider/post.service',
  () => ({ PostsService: class PostsService {} }),
  { virtual: true },
);
jest.mock(
  'src/common/pagination/providers/pagination.provider',
  () => ({ Pagination: class Pagination {} }),
  { virtual: true },
);
jest.mock(
  'src/common/pagination/interfaces/paginated.interface',
  () => ({ Paginated: class Paginated {} }),
  { virtual: true },
);
jest.mock(
  'src/common/pagination/dto/pagination-query.dto',
  () => ({ PaginationQueryDto: class PaginationQueryDto {} }),
  { virtual: true },
);

// ----- DTOs referenced through the alias path style -----
jest.mock('src/DTO/create-user.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/userparamdto', () => ({}), { virtual: true });
jest.mock('src/DTO/patch-user.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/postparamdto', () => ({}), { virtual: true });
jest.mock(
  'src/DTO/create-post.dto',
  () => ({ CreatePostDto: class CreatePostDto {} }),
  { virtual: true },
);
jest.mock(
  'src/DTO/patch-post.dto',
  () => ({ PatchPostDto: class PatchPostDto {} }),
  { virtual: true },
);
jest.mock(
  'src/DTO/getPostdto',
  () => ({ GetPostsDto: class GetPostsDto {} }),
  { virtual: true },
);
jest.mock('src/DTO/signin-dto', () => ({}), { virtual: true });

// ----- Relative paths used by the spec files -----
jest.mock(
  '../users/user.entity',
  () => ({ User: class User {} }),
  { virtual: true },
);
jest.mock(
  '../users/providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock(
  '../users/providers/user-auth.facade',
  () => ({ UserAuthFacade: class UserAuthFacade {} }),
  { virtual: true },
);
jest.mock(
  '../auth/providers/auth.service',
  () => ({ AuthService: class AuthService {} }),
  { virtual: true },
);
jest.mock(
  '../post/post.entity',
  () => ({ Post: class Post {} }),
  { virtual: true },
);
jest.mock(
  '../post/provider/post.service',
  () => ({ PostsService: class PostsService {} }),
  { virtual: true },
);
jest.mock(
  '../dto/post-param.dto',
  () => ({ GetPostsParamDto: class GetPostsParamDto {} }),
  { virtual: true },
);
jest.mock(
  '../dto/create-post.dto',
  () => ({ CreatePostDto: class CreatePostDto {} }),
  { virtual: true },
);
jest.mock(
  '../dto/patch-post.dto',
  () => ({ PatchPostDto: class PatchPostDto {} }),
  { virtual: true },
);
jest.mock(
  '../dto/get-posts.dto',
  () => ({ GetPostsDto: class GetPostsDto {} }),
  { virtual: true },
);
jest.mock('./user.entity', () => ({ User: class User {} }), { virtual: true });
jest.mock(
  './providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock(
  './dtos/createManyUserdto',
  () => ({}),
  { virtual: true },
);
jest.mock('./dto/tweet.entity', () => ({ Tweet: class Tweet {} }), {
  virtual: true,
});

// ----- Guard & audit aliased paths (issue #1678) -----
jest.mock(
  'src/auth/guard/access-token/access-token.guard',
  () => ({ AccessTokenGuard: class AccessTokenGuard {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/interfaces/active-user-data.interface',
  () => ({ ActiveUserData: class ActiveUserData {} }),
  { virtual: true },
);
jest.mock(
  'src/audit/audit.service',
  () => ({ AuditService: class AuditService {} }),
  { virtual: true },
);
jest.mock(
  'src/audit/audit-log.entity',
  () => ({
    AuditAction: {
      CREATE: 'CREATE',
      READ: 'READ',
      UPDATE: 'UPDATE',
      DELETE: 'DELETE',
      CONTRACT_EVENT: 'CONTRACT_EVENT',
      AUTHORIZATION_GRANTED: 'AUTHORIZATION_GRANTED',
      AUTHORIZATION_DENIED: 'AUTHORIZATION_DENIED',
    },
  }),
  { virtual: true },
);
jest.mock(
  'src/common/correlation/correlation-id.store',
  () => ({ CorrelationIdStore: class CorrelationIdStore {} }),
  { virtual: true },
);
jest.mock(
  'src/common/correlation/correlation-id.constants',
  () => ({
    CORRELATION_ID_HEADER: 'x-correlation-id',
    CORRELATION_ID_RESPONSE_HEADER: 'x-correlation-id',
    REQUEST_CORRELATION_ID_KEY: 'correlationId',
  }),
  { virtual: true },
);
jest.mock(
  'src/common/correlation/correlation-id.interceptor',
  () => ({ CorrelationIdInterceptor: class CorrelationIdInterceptor {} }),
  { virtual: true },
);
jest.mock(
  'src/common/correlation/correlation.module',
  () => ({ CorrelationModule: class CorrelationModule {} }),
  { virtual: true },
);
jest.mock(
  'src/crypto/providers/crypto.provider',
  () => ({ CryptoProvider: class CryptoProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/crypto/crypto.module',
  () => ({ CryptoModule: class CryptoModule {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/enums/permission.enum',
  () => ({
    Permission: {
      USERS_READ: 'users:read',
      USERS_CREATE: 'users:create',
      USERS_UPDATE: 'users:update',
      USERS_DELETE: 'users:delete',
      USERS_MANAGE_ROLES: 'users:manage-roles',
      POSTS_CREATE: 'posts:create',
      POSTS_READ: 'posts:read',
      POSTS_UPDATE: 'posts:update',
      POSTS_DELETE: 'posts:delete',
      UPLOAD_CREATE: 'upload:create',
      LEADERBOARD_READ: 'leaderboard:read',
      AUDIT_READ: 'audit:read',
    },
  }),
  { virtual: true },
);
jest.mock(
  'src/auth/enums/role.enum',
  () => ({
    Role: {
      USER: 'user',
      VERIFIED_USER: 'verified_user',
      MODERATOR: 'moderator',
      ADMIN: 'admin',
    },
  }),
  { virtual: true },
);
jest.mock(
  'src/auth/enums/role-permissions',
  () => ({ ROLE_PERMISSIONS: {} }),
  { virtual: true },
);
