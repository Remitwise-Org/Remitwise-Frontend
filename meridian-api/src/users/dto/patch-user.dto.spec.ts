import { validate } from 'class-validator';
import { EditUserDto } from './patch-user.dto';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_MESSAGE,
} from './create-user.dto';

/**
 * Build a password string of exactly `length` characters containing every
 * required class (upper, lower, digit, special), so it can be used as a
 * boundary fixture near MIN/MAX without tripping some other constraint.
 */
function boundaryPassword(length: number): string {
  const core = 'Aa1!';
  if (length <= core.length) return core.slice(0, length);
  return core + 'a'.repeat(length - core.length);
}

/**
 * Build an EditUserDto with the id always present and password intentionally
 * omitted — callers override password per-case to assert either accept/reject
 * branches.
 */
function buildDtoWithPassword(password: string | undefined): EditUserDto {
  const dto = new EditUserDto();
  dto.id = 1;
  dto.password = password as string;
  return dto;
}

async function passwordErrors(password: string | undefined) {
  const dto = buildDtoWithPassword(password);
  const errors = await validate(dto);
  return errors.filter((error) => error.property === 'password');
}

describe('EditUserDto password validation (mirrors issue #425)', () => {
  describe('is optional', () => {
    it('accepts DTOs that omit the password entirely', async () => {
      const dto = new EditUserDto();
      dto.id = 1;
      // password intentionally left undefined
      const errors = (await validate(dto)).filter(
        (e) => e.property === 'password',
      );
      expect(errors).toEqual([]);
    });
  });

  describe('accepts strong passwords', () => {
    it.each([
      'Password1!',
      'Z9?zxywu',
      'aA1!abcd',
      boundaryPassword(PASSWORD_MIN_LENGTH),
      boundaryPassword(PASSWORD_MIN_LENGTH + 4),
      boundaryPassword(PASSWORD_MAX_LENGTH - 4),
      boundaryPassword(PASSWORD_MAX_LENGTH),
    ])('accepts "%s"', async (password) => {
      const errors = await passwordErrors(password);
      expect(errors).toEqual([]);
    });
  });

  describe('rejects weak passwords', () => {
    it('rejects an empty password', async () => {
      const errors = await passwordErrors('');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it(`rejects passwords shorter than ${PASSWORD_MIN_LENGTH} characters`, async () => {
      const tooShort = boundaryPassword(PASSWORD_MIN_LENGTH - 1);
      expect(tooShort.length).toBe(PASSWORD_MIN_LENGTH - 1);
      const errors = await passwordErrors(tooShort);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it(`rejects passwords longer than ${PASSWORD_MAX_LENGTH} characters`, async () => {
      const tooLong = boundaryPassword(PASSWORD_MAX_LENGTH + 1);
      expect(tooLong.length).toBe(PASSWORD_MAX_LENGTH + 1);
      const errors = await passwordErrors(tooLong);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it.each([
      ['weak numeric "123456"', '123456'],
      ['dictionary word "password"', 'password'],
      ['mixed-case only "Password"', 'Password'],
      ['lacks digit "Abcdefg!"', 'Abcdefg!'],
      ['lacks special "Abcdefg1"', 'Abcdefg1'],
      ['lacks lowercase "ABCDEFG1!"', 'ABCDEFG1!'],
      ['lacks uppercase "abcdefg1!"', 'abcdefg1!'],
    ])('rejects %s', async (_label, password) => {
      const errors = await passwordErrors(password);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });
  });

  describe('error surface for the frontend', () => {
    it('exposes a human-readable message on the failing constraint', async () => {
      const errors = await passwordErrors('password');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.matches).toBe(PASSWORD_STRENGTH_MESSAGE);
    });
  });
});
