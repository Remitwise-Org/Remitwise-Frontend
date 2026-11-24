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

/**
 * Breaker state shape accepted by the error handler. Structurally compatible
 * with the circuit breaker's state object (which may carry extra fields).
 */
export interface BreakerStateLike {
  state: 'closed' | 'open' | 'half_open';
  retryAfterMs?: number;
}

/**
 * Error thrown when the Soroban RPC circuit breaker is open.
 * Mapped to HTTP 503 with a Retry-After header.
 */
export class CircuitOpenError extends Error {
  readonly status = 503;
  readonly code = 'CIRCUIT_OPEN';
  constructor(public retryAfterSeconds: number, message = 'Soroban RPC is temporarily unavailable') {
    super(message);
    this.name = 'CircuitOpenError';
  }

  /** Build a CircuitOpenError from a breaker state object. */
  static fromBreakerState(breaker: BreakerStateLike): CircuitOpenError {
    const ms = breaker.retryAfterMs ?? 0;
    return new CircuitOpenError(Math.max(1, Math.ceil(ms / 1000)));
  }
}

export function mapError(error: unknown, requestId?: string): { status: number; body: ErrorEnvelope; retryAfter?: number } {
  if (error instanceof CircuitOpenError) {
    return {
      status: 503,
      body: {
        success: false,
        error: { code: error.code, message: error.message },
        requestId,
      },
      retryAfter: error.retryAfterSeconds,
    };
  }

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

export function withApiErrorHandler<R extends Request = Request>(
  handler: (request: R, ...args: any[]) => Promise<Response>
) {
  return async function (request: R, ...args: any[]) {
    const requestId = request.headers.get('x-request-id') || 'req-' + Math.random().toString(36).substring(2, 11);
    try {
      const response = await handler(request, ...args);
      if (response && response.headers && !response.headers.has('x-request-id')) {
        response.headers.set('x-request-id', requestId);
      }
      return response;
    } catch (error) {
      const { status, body, retryAfter } = mapError(error, requestId);
      const response = NextResponse.json(body, { status });
      response.headers.set('x-request-id', requestId);
      if (retryAfter !== undefined) {
        response.headers.set('Retry-After', String(retryAfter));
      }
      return response;
    }
  };
}
