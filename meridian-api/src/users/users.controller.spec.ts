import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

// Mocks for aliased paths that Jest cannot resolve.
jest.mock('src/DTO/create-user.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/userparamdto', () => ({}), { virtual: true });
jest.mock('src/DTO/patch-user.dto', () => ({}), { virtual: true });
jest.mock('./dtos/createManyUserdto', () => ({}), { virtual: true });
jest.mock('./user.entity', () => ({ User: class User {} }));
jest.mock(
  '../auth/providers/user-auth.facade',
  () => ({ UserAuthFacade: class UserAuthFacade {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/providers/hashing',
  () => ({ HashingProvider: class HashingProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/mail/providers/mail.provider',
  () => ({ MailProvider: class MailProvider {} }),
  { virtual: true },
);

import { UsersController } from './users.controller';
import { UserService } from './providers/user.services';
import { PASSWORD_STRENGTH_MESSAGE } from './dto/create-user.dto';
import { validationExceptionFactory } from '../common/exceptions/validation.exception';

describe('UsersController (integration)', () => {
  let app: INestApplication;
  let userService: {
    findAll: jest.Mock;
    createUsers: jest.Mock;
    createMany: jest.Mock;
    deleteUser: jest.Mock;
    editUser: jest.Mock;
    createUserWithBook: jest.Mock;
    getAllUserWithBook: jest.Mock;
    findOneById: jest.Mock;
    findOneId: jest.Mock;
  };

  beforeEach(async () => {
    userService = {
      findAll: jest.fn(async () => [
        {
          id: 1,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      ]),
      createUsers: jest.fn(async () => [
        {
          id: 1,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      ]),
      createMany: jest.fn(async () => [{ id: 1 }, { id: 2 }]),
      deleteUser: jest.fn(),
      editUser: jest.fn(async (dto) => ({ ...dto })),
      createUserWithBook: jest.fn(async () => ({ id: 1 })),
      getAllUserWithBook: jest.fn(async () => [{ id: 1 }]),
      findOneById: jest.fn(async (id: number) =>
        id === 1 ? { id, firstName: 'Jane' } : null,
      ),
      findOneId: jest.fn(async () => ({ id: 1, firstName: 'Jane' })),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /users forwards query params to findAll', async () => {
    await request(app.getHttpServer())
      .get('/users/1?limit=25&page=2')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });

    expect(userService.findAll).toHaveBeenCalled();
    const [paramArg, limitArg, pageArg] = userService.findAll.mock.calls[0];
    expect(limitArg).toBe(25);
    expect(pageArg).toBe(2);
    expect(paramArg).toBeDefined();
  });

  it('POST /users creates a single user', async () => {
    const dto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'plain',
    };

    await request(app.getHttpServer())
      .post('/users')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toEqual([
          expect.objectContaining({ email: 'jane@example.com' }),
        ]);
      });

    expect(userService.createUsers).toHaveBeenCalledWith(
      expect.objectContaining(dto),
    );
  });

  it('POST /users/many-users creates multiple users', async () => {
    const dto = {
      users: [
        {
          firstName: 'A',
          lastName: 'B',
          email: 'a@b.com',
          password: 'pw',
        },
        {
          firstName: 'C',
          lastName: 'D',
          email: 'c@d.com',
          password: 'pw',
        },
      ],
    };

    await request(app.getHttpServer())
      .post('/users/many-users')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveLength(2);
      });

    expect(userService.createMany).toHaveBeenCalledWith(dto);
  });

  it('DELETE /users/:id responds with status 200', async () => {
    const response = await request(app.getHttpServer())
      .delete('/users/1')
      .expect(200);

    expect(response).toBeDefined();
    expect(userService.deleteUser).toHaveBeenCalledWith(1);
  });

  it('PATCH /users updates user details', async () => {
    const dto = { id: 1, firstName: 'Updated' };

    await request(app.getHttpServer())
      .patch('/users')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject(dto);
      });

    expect(userService.editUser).toHaveBeenCalledWith(dto);
  });

  it('POST /users/with-book creates a user with a book', async () => {
    const dto = { firstName: 'Ada', email: 'ada@example.com', password: 'pw' };

    await request(app.getHttpServer())
      .post('/users/with-book')
      .send(dto)
      .expect(201);

    expect(userService.createUserWithBook).toHaveBeenCalledWith(
      expect.objectContaining(dto),
    );
  });

  it('GET /users/with-book returns users with their books', async () => {
    const response = await request(app.getHttpServer()).get('/users/with-book');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([{ id: 1 }]);
  });

  it('GET /users/find/:id returns the user', async () => {
    await request(app.getHttpServer())
      .get('/users/find/1')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ id: 1 });
      });

    expect(userService.findOneById).toHaveBeenCalledWith(1);
  });

  it('GET /users/find/:id returns 400 for a non-numeric id', async () => {
    await request(app.getHttpServer())
      .get('/users/find/not-a-number')
      .expect(400);
  });
});

/**
 * Issue #425 — exercises the end-to-end HTTP flow with Nest's global
 * ValidationPipe (mirroring `main.ts`) to prove that a weak password
 * produces a 400 Bad Request with the structured `{ field, message,
 * constraint }` shape that the frontend will pin to specific form fields.
 *
 * The previous describe block deliberately omits the global pipe so that it
 * can assert the controller's happy paths; this block adds a fresh testing
 * module + app instance configured exactly like production.
 */
describe('UsersController POST /users password validation via ValidationPipe (issue #425)', () => {
  let appWithPipe: INestApplication;
  let userServiceMock: {
    createUsers: jest.Mock;
    editUser: jest.Mock;
  };

  interface ValidationErrorRow {
    field: string;
    message: string;
    constraint: string;
  }

  const isValidationErrorRow = (value: unknown): value is ValidationErrorRow =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ValidationErrorRow).field === 'string' &&
    typeof (value as ValidationErrorRow).message === 'string' &&
    typeof (value as ValidationErrorRow).constraint === 'string';

  const extractErrorRows = (body: {
    errors?: unknown;
  }): ValidationErrorRow[] =>
    Array.isArray(body.errors) ? body.errors.filter(isValidationErrorRow) : [];

  beforeEach(async () => {
    userServiceMock = {
      createUsers: jest.fn(async () => [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        },
      ]),
      editUser: jest.fn(async () => [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        },
      ]),
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UserService, useValue: userServiceMock }],
    }).compile();
    appWithPipe = moduleRef.createNestApplication();
    appWithPipe.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: validationExceptionFactory,
      }),
    );
    await appWithPipe.init();
  });

  afterEach(async () => {
    await appWithPipe.close();
  });

  it('returns 400 with structured field-level errors when the password is weak', async () => {
    const dto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password', // no uppercase, no digit, no special
    };

    const response = await request(appWithPipe.getHttpServer())
      .post('/users')
      .send(dto)
      .expect(400);

    // Top-level shape — matches main.ts response body
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
    });

    // Structured rows
    const rows = extractErrorRows(response.body);
    expect(rows.length).toBeGreaterThan(0);

    // Every relevant password constraint must surface its own row, each
    // carrying the constraint key and the human-readable message.
    const passwordRows = rows.filter((r) => r.field === 'password');
    expect(passwordRows.length).toBeGreaterThan(0);

    const constraints = passwordRows.map((r) => r.constraint);
    expect(constraints).toContain('matches');

    const matchesRow = passwordRows.find((r) => r.constraint === 'matches');
    expect(matchesRow?.message).toContain(PASSWORD_STRENGTH_MESSAGE);

    // The controller must not have invoked the service — validation rejected
    // the request before reaching the handler.
    expect(userServiceMock.createUsers).not.toHaveBeenCalled();
  });

  it('returns 400 when the password is too short (< 8 chars)', async () => {
    const dto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'Ab1!',
    };
    const response = await request(appWithPipe.getHttpServer())
      .post('/users')
      .send(dto)
      .expect(400);
    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    const rows = extractErrorRows(response.body);
    expect(rows.length).toBeGreaterThan(0);
    // The `matches` constraint's .{8,16} anchor surface for too-short input.
    expect(
      rows.some((r) => r.field === 'password' && r.constraint === 'matches'),
    ).toBe(true);
  });

  it('returns 400 when the password is too long (> 16 chars)', async () => {
    const dto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'Abcdef1!Abcdef1Ab', // 17 chars
    };
    const response = await request(appWithPipe.getHttpServer())
      .post('/users')
      .send(dto)
      .expect(400);
    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    const rows = extractErrorRows(response.body);
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.some((r) => r.field === 'password' && r.constraint === 'matches'),
    ).toBe(true);
  });

  it('returns 400 with a row per failing field when multiple fields are invalid', async () => {
    const dto = {
      firstName: 'J', // too short for @MinLength(2)
      lastName: 'Doe',
      email: 'not-an-email', // fails @IsEmail
      password: 'Password1!',
    };
    const response = await request(appWithPipe.getHttpServer())
      .post('/users')
      .send(dto)
      .expect(400);
    const rows = extractErrorRows(response.body);
    const fields = new Set(rows.map((r) => r.field));
    expect(fields.has('firstName')).toBe(true);
    expect(fields.has('email')).toBe(true);
    // Password succeeded; it must NOT appear in the error rows.
    expect(fields.has('password')).toBe(false);
  });

  it('returns 201 when the password meets every requirement', async () => {
    const dto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'Password1!',
    };
    await request(appWithPipe.getHttpServer())
      .post('/users')
      .send(dto)
      .expect(201);
    expect(userServiceMock.createUsers).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'Password1!' }),
    );
  });

  it('returns 400 on PATCH /users when the new password is weak (mirrors EditUserDto policy)', async () => {
    const dto = { id: 1, password: 'password' };
    const response = await request(appWithPipe.getHttpServer())
      .patch('/users')
      .send(dto)
      .expect(400);
    expect(response.body.message).toBe('Validation failed');
    const rows = extractErrorRows(response.body);
    const passwordRows = rows.filter((r) => r.field === 'password');
    expect(passwordRows.length).toBeGreaterThan(0);
    expect(
      passwordRows.find((r) => r.constraint === 'matches')?.message,
    ).toContain(PASSWORD_STRENGTH_MESSAGE);
    expect(userServiceMock.editUser).not.toHaveBeenCalled();
  });

  it('accepts PATCH /users that omits the password', async () => {
    await request(appWithPipe.getHttpServer())
      .patch('/users')
      .send({ id: 1, firstName: 'Updated' })
      .expect(200);
    expect(userServiceMock.editUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, firstName: 'Updated' }),
    );
  });

  it('accepts PATCH /users when the new password meets the policy', async () => {
    const dto = { id: 1, password: 'Password1!' };
    await request(appWithPipe.getHttpServer())
      .patch('/users')
      .send(dto)
      .expect(200);
    expect(userServiceMock.editUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, password: 'Password1!' }),
    );
  });
});
