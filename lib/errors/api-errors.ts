import { NextResponse } from 'next/server';

// Make message optional with a clear default value to satisfy legacy tests
export const createValidationError = (message: string = 'Validation Error', details?: any) => {
  return NextResponse.json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: details ? `${message}: ${JSON.stringify(details)}` : message }
  }, { status: 400 });
};

export const createAuthenticationError = (message: string = 'Authentication Required', details?: any) => {
  return NextResponse.json({
    success: false,
    error: { code: 'AUTHENTICATION_ERROR', message }
  }, { status: 401 });
};

export const createNotFoundError = (message: string = 'Not Found') => {
  return NextResponse.json({
    success: false,
    error: { code: 'NOT_FOUND', message }
  }, { status: 404 });
};

export const createBadRequestError = (message: string = 'Bad Request') => {
  return NextResponse.json({
    success: false,
    error: { code: 'BAD_REQUEST', message }
  }, { status: 400 });
};

export const handleUnexpectedError = (error: any) => {
  return NextResponse.json({
    success: false,
    error: { code: 'UNEXPECTED_ERROR', message: String(error?.message || error) }
  }, { status: 500 });
};
