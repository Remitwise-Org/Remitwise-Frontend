import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { CorrelationIdInterceptor } from './correlation-id.interceptor';
import { CorrelationIdStore } from './correlation-id.store';
import {
  CORRELATION_ID_HEADER,
  CORRELATION_ID_RESPONSE_HEADER,
  REQUEST_CORRELATION_ID_KEY,
} from './correlation-id.constants';

const run = async (
  headers: Record<string, string | undefined>,
  store: CorrelationIdStore,
) => {
  const setHeader = jest.fn();
  const request: Record<string, unknown> = { headers };
  const context = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;
  const interceptor = new CorrelationIdInterceptor(store);
  const handler: CallHandler = {
    handle: () => of({ ok: true }),
  };
  const result = await lastValueFrom(interceptor.intercept(context, handler));
  return { result, request, setHeader, store };
};

describe('CorrelationIdInterceptor', () => {
  it('propagates an incoming X-Correlation-ID and echoes it on the response', async () => {
    const store = new CorrelationIdStore();
    const { request, setHeader } = await run(
      { [CORRELATION_ID_HEADER]: 'cid-from-client' },
      store,
    );
    expect(request[REQUEST_CORRELATION_ID_KEY]).toBe('cid-from-client');
    expect(setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_RESPONSE_HEADER,
      'cid-from-client',
    );
  });

  it('generates a correlation ID when the header is absent', async () => {
    const store = new CorrelationIdStore();
    const { request, setHeader } = await run({}, store);
    const generated = request[REQUEST_CORRELATION_ID_KEY] as string;
    expect(generated).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_RESPONSE_HEADER,
      generated,
    );
  });

  it('exposes the id to downstream services via CorrelationIdStore', async () => {
    const store = new CorrelationIdStore();
    let seen: string | undefined;
    const setHeader = jest.fn();
    const request: Record<string, unknown> = {
      headers: { [CORRELATION_ID_HEADER]: 'flow-id' },
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setHeader }),
      }),
    } as unknown as ExecutionContext;
    const interceptor = new CorrelationIdInterceptor(store);
    const handler: CallHandler = {
      handle: () => {
        seen = store.get();
        return of({ ok: true });
      },
    };
    await lastValueFrom(interceptor.intercept(context, handler));
    expect(seen).toBe('flow-id');
  });
});
