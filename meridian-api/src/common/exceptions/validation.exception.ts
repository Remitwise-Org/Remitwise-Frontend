import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export interface ValidationFieldError {
  /** Dotted/bracketed path to the offending field (e.g. "password", "users[0].email"). */
  field: string;
  /** Human-readable message that the frontend can render. */
  message: string;
  /** class-validator constraint key (e.g. "matches", "isEmail", "minLength"). */
  constraint: string;
}

/**
 * Build a child-property path segment.
 *
 * - Regular object property → dot notation: `"a" + "b"` → `"a.b"`
 * - Numeric index (typical for `@ValidateNested({ each: true })`) → bracket notation:
 *   `"users" + "0"` → `"users[0]"`
 */
function joinPath(parent: string, child: string): string {
  if (/^\d+$/.test(child)) {
    return `${parent}[${child}]`;
  }
  return parent ? `${parent}.${child}` : child;
}

/**
 * Recursively flatten class-validator's `ValidationError` tree into a flat
 * `[{ field, message, constraint }]` list. Each failing constraint on a
 * given field is emitted as its own row so the FE can render every problem
 * at once instead of asking the user to fix one at a time.
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationFieldError[] {
  const result: ValidationFieldError[] = [];

  for (const error of errors) {
    const path = joinPath(parentPath, error.property);

    if (error.constraints) {
      for (const [constraint, message] of Object.entries(error.constraints)) {
        result.push({ field: path, message, constraint });
      }
    }

    if (error.children && error.children.length > 0) {
      result.push(...flattenValidationErrors(error.children, path));
    }
  }

  return result;
}

/**
 * 400 Bad Request whose response body carries a structured `errors` array
 * (`[{ field, message, constraint }]`) alongside a fixed top-level
 * `message: "Validation failed"` so naive Axios/Fetch error handlers that
 * display `error.response.data.message` still get something useful.
 */
export class ValidationException extends BadRequestException {
  constructor(errors: ValidationFieldError[]) {
    super({
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
      errors,
    });
  }
}

/**
 * Drop-in `exceptionFactory` for `new ValidationPipe({ exceptionFactory, … })`.
 * Converts `ValidationError[]` from class-validator into the structured shape.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): ValidationException {
  return new ValidationException(flattenValidationErrors(errors));
}
