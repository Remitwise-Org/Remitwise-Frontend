import { Inject, Injectable, Optional, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CorrelationIdStore } from './correlation-id.store';
import { REQUEST_CORRELATION_ID_KEY } from './correlation-id.constants';

/**
 * Request-scoped accessor. Services inject this instead of Request.
 * Falls back to AsyncLocalStorage when used outside a HTTP request.
 */
@Injectable({ scope: Scope.REQUEST, durable: false })
export class CorrelationIdProvider {
  constructor(
    @Optional() @Inject(REQUEST) private readonly request: { [REQUEST_CORRELATION_ID_KEY]?: string } | null,
    private readonly store: CorrelationIdStore,
  ) {}

  get(): string | undefined {
    return this.request?.[REQUEST_CORRELATION_ID_KEY] ?? this.store.get();
  }
}
