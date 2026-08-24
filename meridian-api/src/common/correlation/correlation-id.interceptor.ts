import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { CorrelationIdStore } from './correlation-id.store';
import {
  CORRELATION_ID_HEADER,
  CORRELATION_ID_RESPONSE_HEADER,
  REQUEST_CORRELATION_ID_KEY,
} from './correlation-id.constants';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  constructor(private readonly store: CorrelationIdStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{
      headers: Record<string, string | string[] | undefined>;
      [REQUEST_CORRELATION_ID_KEY]?: string;
    }>();
    const response = http.getResponse<{
      setHeader: (name: string, value: string) => void;
    }>();

    const incoming = request.headers[CORRELATION_ID_HEADER];
    const headerValue = Array.isArray(incoming) ? incoming[0] : incoming;
    const correlationId =
      headerValue && headerValue.trim().length > 0
        ? headerValue.trim()
        : randomUUID();

    request[REQUEST_CORRELATION_ID_KEY] = correlationId;
    response.setHeader(CORRELATION_ID_RESPONSE_HEADER, correlationId);

    return new Observable((subscriber) => {
      this.store.run(correlationId, () => {
        next
          .handle()
          .pipe(
            tap(() => {
              response.setHeader(CORRELATION_ID_RESPONSE_HEADER, correlationId);
            }),
          )
          .subscribe(subscriber);
      });
    });
  }
}
