import { NextResponse } from 'next/server';
import { ContractError } from '../errors/contract-errors';

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
}

// Backward compatibility alias for legacy v1 route imports
export class ApiRouteError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function mapError(error: unknown, requestId?: string): { status: number; body: ErrorEnvelope } {
  if (error instanceof ContractError) {
    return {
      status: error.httpStatus,
      body: {
        success: false,
        error: { code: error.code, message: error.message },
        requestId,
      },
    };
  }

  if (error instanceof ApiRouteError) {
    return {
      status: error.status,
      body: {
        success: false,
        error: { code: error.code, message: error.message },
        requestId,
      },
    };
  }

  if (error instanceof Error) {
    const status = (error as any).status || (error as any).httpStatus || 500;
    const code = (error as any).code || 'INTERNAL_SERVER_ERROR';
    return {
      status,
      body: {
        success: false,
        error: { code, message: error.message },
        requestId,
      },
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: String(error) },
      requestId,
    },
  };
}

export function withApiErrorHandler(handler: (request: Request, ...args: any[]) => Promise<Response>) {
  return async function (request: Request, ...args: any[]) {
    const requestId = request.headers.get('x-request-id') || 'req-' + Math.random().toString(36).substring(2, 11);
    try {
      const response = await handler(request, ...args);
      if (response && response.headers && !response.headers.has('x-request-id')) {
        response.headers.set('x-request-id', requestId);
      }
      return response;
    } catch (error) {
      const { status, body } = mapError(error, requestId);
      const response = NextResponse.json(body, { status });
      response.headers.set('x-request-id', requestId);
      return response;
    }
  };
}
