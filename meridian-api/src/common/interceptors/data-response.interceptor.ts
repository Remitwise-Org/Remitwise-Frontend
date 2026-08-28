import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

/**
 * Current API version embedded in every response envelope.
 * Exported so consumers (other interceptors, integrations tests,
 * docs) reference a single source of truth.
 */
export const API_VERSION = '0.0.1';

/**
 * Shape of the response envelope applied to every controller
 * payload. Keeping it as a dedicated type makes the contract
 * verifiable from tests and gives the IDE something to lean on.
 */
export interface DataResponseEnvelope<T> {
  apiversion: string;
  result: number;
  data: T;
}

@Injectable()
export class DataResponseInterceptor<T = unknown> implements NestInterceptor<
  T,
  DataResponseEnvelope<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<DataResponseEnvelope<T>> {
    return next.handle().pipe(map((data: T) => this.transform(data)));
  }

  /**
   * Wrap a controller payload in a uniform envelope:
   *
   *   { apiversion: string, result: number, data: T }
   *
   * - `Array.isArray(data)` → `result` is the array length.
   * - Single objects / primitives → `result: 1`.
   * - `null` / `undefined` → `result: 0, data: null` so clients never
   *   see a missing or undefined `data` field.
   *
   * Plain objects that happen to expose a numeric `length` field are
   * intentionally NOT treated as arrays – only real JavaScript arrays
   * (and nothing else) trigger the array branch.
   *
   * Exposed as a pure instance method so it can be unit-tested
   * without standing up the rest of the Nest testing harness.
   */
  transform(data: T): DataResponseEnvelope<T> {
    if (data === null || data === undefined) {
      return { apiversion: API_VERSION, result: 0, data: null as T };
    }

    if (Array.isArray(data)) {
      return { apiversion: API_VERSION, result: data.length, data };
    }

    return { apiversion: API_VERSION, result: 1, data };
  }
}
