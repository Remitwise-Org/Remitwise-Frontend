// Error handling utilities
import { NextResponse } from 'next/server';
import { ValidationError } from '../validation/percentages';
import { AuthenticationError, NetworkError, SimulationError } from '../types/api';
import { ContractError } from '../errors/contract-errors';

/**
 * Handles errors and returns appropriate NextResponse
 */
export function handleAPIError(error: unknown): NextResponse {
  // Log error for debugging
  console.error('API Error:', error);

  // Handle validation errors
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  // Handle authentication errors
  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }

  // Handle contract errors
  if (error instanceof ContractError) {
    const status = error.httpStatus ?? 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status }
    );
  }

  // Handle network errors
  if (error instanceof NetworkError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 503 }
    );
  }

  // Handle simulation errors
  if (error instanceof SimulationError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  // Handle generic errors
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred';

  return NextResponse.json(
    { success: false, error: errorMessage },
    { status: 500 }
  );
}

/**
 * Logs error with context for debugging
 */
export function logError(context: string, error: unknown, metadata?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error({
    timestamp,
    context,
    error: errorMessage,
    stack: errorStack,
    metadata,
  });
}
