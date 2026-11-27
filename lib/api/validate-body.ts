import { NextRequest } from 'next/server';
import type { ZodTypeAny, z } from 'zod';

export type ValidationIssueDetail = {
  path: string;
  message: string;
};

/**
 * HTTP-aware error thrown by request body validation. Carries the status code
 * and optional per-field details so the shared error handler can format it.
 */
export class RequestValidationError extends Error {
  readonly status: number;
  readonly details?: ValidationIssueDetail[];

  constructor(status: number, message: string, details?: ValidationIssueDetail[]) {
    super(message);
    this.name = 'RequestValidationError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Parses and validates a JSON request body against a Zod schema.
 *
 * - Malformed JSON → 400 (never a 500).
 * - Wrong / missing Content-Type → 415.
 * - Schema violations → 422 with per-field issues.
 * - Unknown keys are stripped by default (Zod object behaviour); schemas can
 *   opt into rejection with `.strict()`.
 */
export async function parseJsonBody<S extends ZodTypeAny>(
  request: NextRequest | Request,
  schema: S,
): Promise<z.infer<S>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new RequestValidationError(415, 'Content-Type must be application/json');
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new RequestValidationError(400, 'Malformed JSON request body');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const details: ValidationIssueDetail[] = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new RequestValidationError(422, 'Request body validation failed', details);
  }

  return result.data;
}
