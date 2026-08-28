import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import {
  ValidationException,
  ValidationFieldError,
  flattenValidationErrors,
  validationExceptionFactory,
} from './validation.exception';

/**
 * Build a class-validator `ValidationError`-shaped object with sensible
 * defaults so each test focuses on just the field it's exercising.
 */
function vErr(
  property: string,
  constraints: Record<string, string> = {},
  children: ValidationError[] = [],
): ValidationError {
  return {
    property,
    constraints,
    children,
  } as unknown as ValidationError;
}

describe('flattenValidationErrors', () => {
  it('produces one row per failing constraint on a single property', () => {
    const result = flattenValidationErrors([
      vErr('password', {
        matches: 'Password must be 8-16 chars…',
      }),
    ]);
    expect(result).toEqual([
      {
        field: 'password',
        message: 'Password must be 8-16 chars…',
        constraint: 'matches',
      },
    ]);
  });

  it('flattens multiple constraints on the same property into multiple rows', () => {
    const result = flattenValidationErrors([
      vErr('firstName', {
        minLength: 'firstName must be longer than or equal to 2 characters',
        maxLength: 'firstName must be shorter than or equal to 50 characters',
      }),
    ]);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.field === 'firstName')).toBe(true);
    expect(result.map((e) => e.constraint).sort()).toEqual([
      'maxLength',
      'minLength',
    ]);
  });

  it('flattens multiple top-level properties independently', () => {
    const result = flattenValidationErrors([
      vErr('password', { matches: 'weak' }),
      vErr('email', { isEmail: 'email must be an email' }),
    ]);
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { field: 'password', message: 'weak', constraint: 'matches' },
        {
          field: 'email',
          message: 'email must be an email',
          constraint: 'isEmail',
        },
      ]),
    );
  });

  it('walks nested children with dot-notation paths', () => {
    const result = flattenValidationErrors([
      vErr('user', {}, [
        vErr('profile', {}, [vErr('email', { isEmail: 'must be valid' })]),
      ]),
    ]);
    expect(result).toEqual([
      {
        field: 'user.profile.email',
        message: 'must be valid',
        constraint: 'isEmail',
      },
    ]);
  });

  it('uses bracket notation for numeric indices (array items)', () => {
    const result = flattenValidationErrors([
      vErr('users', {}, [
        vErr('0', {}, [vErr('email', { isEmail: 'must be valid' })]),
      ]),
    ]);
    expect(result).toEqual([
      {
        field: 'users[0].email',
        message: 'must be valid',
        constraint: 'isEmail',
      },
    ]);
  });

  it('merges root-level constraints with nested children on the same branch', () => {
    const result = flattenValidationErrors([
      vErr('user', { isObject: 'user must be an object' }),
    ]);
    expect(result).toEqual([
      {
        field: 'user',
        message: 'user must be an object',
        constraint: 'isObject',
      },
    ]);
  });

  it('returns an empty list for a node that has neither constraints nor children', () => {
    const result = flattenValidationErrors([vErr('orphan')]);
    expect(result).toEqual([]);
  });

  it('returns an empty list when given an empty array', () => {
    expect(flattenValidationErrors([])).toEqual([]);
  });
});

describe('ValidationException', () => {
  it('is a BadRequestException that emits HTTP 400', () => {
    const ex = new ValidationException([]);
    expect(ex).toBeInstanceOf(BadRequestException);
    expect(ex.getStatus()).toBe(400);
  });

  it('produces the documented response shape (statusCode, error, message, errors)', () => {
    const errors: ValidationFieldError[] = [
      { field: 'a', message: 'bad', constraint: 'isString' },
    ];
    const ex = new ValidationException(errors);
    const body = ex.getResponse() as Record<string, unknown>;
    expect(body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      errors,
    });
  });
});

describe('validationExceptionFactory (ValidationPipe drop-in)', () => {
  it('returns a ValidationException wrapping the flattened rows', () => {
    const ex = validationExceptionFactory([
      vErr('password', { matches: 'Password weak' }),
    ]);
    expect(ex).toBeInstanceOf(ValidationException);
    const body = ex.getResponse() as Record<string, unknown>;
    expect(body.errors).toEqual([
      { field: 'password', message: 'Password weak', constraint: 'matches' },
    ]);
    expect(body.message).toBe('Validation failed');
  });

  it('end-to-end: a realistic failure set produces a fully-shaped body', () => {
    const ex = validationExceptionFactory([
      vErr('password', {
        matches: 'Password must be 8-16 …',
      }),
      vErr('email', { isEmail: 'email must be an email' }),
      vErr('users', {}, [
        vErr('0', {}, [vErr('firstName', { minLength: 'must be longer' })]),
      ]),
    ]);
    const body = ex.getResponse() as Record<string, unknown>;
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('Validation failed');
    const errors = body.errors as ValidationFieldError[];
    expect(errors).toHaveLength(3);
    expect(errors).toEqual(
      expect.arrayContaining([
        {
          field: 'password',
          message: 'Password must be 8-16 …',
          constraint: 'matches',
        },
        {
          field: 'email',
          message: 'email must be an email',
          constraint: 'isEmail',
        },
        {
          field: 'users[0].firstName',
          message: 'must be longer',
          constraint: 'minLength',
        },
      ]),
    );
  });
});
