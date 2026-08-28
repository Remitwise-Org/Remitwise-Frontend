import { validate } from 'class-validator';
import {
  CreateUserDto,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_MESSAGE,
  PASSWORD_STRENGTH_REGEX,
} from './create-user.dto';

/**
 * Helper: build a fully-formed DTO instance, overriding only the password
 * field. Other fields are populated with values that pass validation so a
 * failing assertion is attributable to the password.
 */
function buildDtoWithPassword(password: string | undefined): CreateUserDto {
  const dto = new CreateUserDto();
  dto.firstName = 'John';
  dto.lastName = 'Doe';
  dto.email = 'john.doe@example.com';
  dto.password = password as string;
  return dto;
}

/**
 * Build a password string of exactly `length` characters that contains every
 * required class (upper, lower, digit, special), so it can be used as a
 * boundary fixture near MIN/MAX without accidentally tripping some other
 * validation reason. When `length === PASSWORD_MIN_LENGTH`, the leading
 * classes contribute exactly `length` characters; for longer lengths we pad
 * with extra lowercase letters until we reach the target length.
 */
function boundaryPassword(length: number): string {
  const core = 'Aa1!';
  if (length <= core.length) return core.slice(0, length);
  return core + 'a'.repeat(length - core.length);
}

/**
 * Helper: collect only the validation errors that belong to the `password`
 * field. Other field errors (firstName, email, etc.) are ignored so tests can
 * assert password-specific behaviour cleanly.
 */
async function passwordErrors(password: string | undefined) {
  const dto = buildDtoWithPassword(password);
  const errors = await validate(dto);
  return errors.filter((error) => error.property === 'password');
}

describe('CreateUserDto password validation (issue #425)', () => {
  describe('policy/constants coherence', () => {
    it('keeps the regex length anchor in sync with PASSWORD_MIN_LENGTH/MAX', () => {
      // Drift detection: bumping PASSWORD_MIN_LENGTH or PASSWORD_MAX_LENGTH
      // without updating the regex literal in `create-user.dto.ts` would
      // otherwise leave the regex's trailing `.{MIN,MAX}` tail out of sync.
      // This assertion fails loudly so the inconsistency can't slip past CI.
      // Using `.toContain` keeps the check a literal substring match instead
      // of a regex pattern — avoids any future misuse of `$` / `.` in the
      // regex source confusing the assertion.
      expect(PASSWORD_STRENGTH_REGEX.source).toContain(
        `.{${PASSWORD_MIN_LENGTH},${PASSWORD_MAX_LENGTH}}$`,
      );
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
      // Exactly at the maximum length, all four classes present
      boundaryPassword(PASSWORD_MAX_LENGTH),
    ])('accepts "%s" (%i chars)', async (password) => {
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

    it('rejects an undefined password', async () => {
      const errors = await passwordErrors(undefined);
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

      // Compare against the exact string emitted by the @Matches decorator
      // so the assertion isn't sensitive to JSON.stringify escape behaviour
      // (which doubles up backslashes and escapes quotes).
      expect(errors[0].constraints?.matches).toBe(PASSWORD_STRENGTH_MESSAGE);
    });
  });
});
