import { ValidationError } from '../validation/percentages';
import { AuthenticationError, ContractError, NetworkError, SimulationError } from '../types/api';

type ApiResponse = { success: boolean; error?: string; status: number };

function makeResponse(data: { success: boolean; error?: string }, init?: { status?: number }): ApiResponse {
  return { ...data, status: init?.status ?? 200 };
}

export function handleAPIError(error: unknown): ApiResponse {
  console.error('API Error:', error);
  if (error instanceof ValidationError) {
    return makeResponse({ success: false, error: error.message }, { status: 400 });
  }
  if (error instanceof AuthenticationError) {
    return makeResponse({ success: false, error: error.message }, { status: 401 });
  }
  if (error instanceof ContractError) {
    return makeResponse({ success: false, error: error.message }, { status: 500 });
  }
  if (error instanceof NetworkError) {
    return makeResponse({ success: false, error: error.message }, { status: 503 });
  }
  if (error instanceof SimulationError) {
    return makeResponse({ success: false, error: error.message }, { status: 400 });
  }
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  return makeResponse({ success: false, error: errorMessage }, { status: 500 });
}

export function logError(context: string, error: unknown, metadata?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  console.error({ timestamp, context, error: errorMessage, stack: errorStack, metadata });
}
