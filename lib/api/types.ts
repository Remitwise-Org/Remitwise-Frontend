/**
 * Shared API response and error types for consistent handling across all routes.
 *
 * Usage:
 * - Use ApiResponse<T> for response body typing.
 * - Use jsonSuccess(data) for 200 responses.
 * - Use jsonError(code, message) for error responses (status derived from code).
 * - Map validation/auth/not-found errors to ApiError codes for consistent client handling.
 */

import { NextResponse } from 'next/server';

/** Successful response shape */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Error response shape */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

/** Standard error codes with consistent semantics */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONTRACT_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

/** HTTP status code for each error code */
const ERROR_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONTRACT_ERROR: 502,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/**
 * Returns a NextResponse with success body and 200 status.
 * Use for GET/POST/PATCH success responses.
 */
export function jsonSuccess<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true as const, data }, { status: 200 });
}

/**
 * Returns a NextResponse with error body and status derived from code.
 * Use for all error paths to keep responses consistent.
 */
export function jsonError(
  code: ApiErrorCode,
  message: string
): NextResponse<ApiErrorResponse> {
  const status = ERROR_STATUS[code];
  return NextResponse.json(
    {
      success: false as const,
      error: { code, message },
    },
    { status }
  );
}
