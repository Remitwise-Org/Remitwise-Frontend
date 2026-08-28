import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import {
  API_VERSION,
  DataResponseInterceptor,
} from './data-response.interceptor';

/**
 * Builds a minimal ExecutionContext stub. DataResponseInterceptor never
 * touches the context, so we only need the surface NestJS expects to
 * exist when the interceptor is invoked.
 */
const buildContext = (): ExecutionContext =>
  ({
    switchToHttp: () => ({}),
  }) as unknown as ExecutionContext;

/**
 * Drives the interceptor end-to-end with `next.handle()` replaced by
 * an RxJS stream that emits `value`. Returns the resolved envelope
 * (the final onNext value passed to the HTTP socket).
 */
const runHandler = async <T>(value: T) => {
  const interceptor = new DataResponseInterceptor<T>();
  const handler: CallHandler<T> = { handle: () => of(value) };
  const result$ = interceptor.intercept(buildContext(), handler);
  return lastValueFrom(result$);
};

describe('DataResponseInterceptor', () => {
  describe('constants', () => {
    it('exports the API version', () => {
      expect(API_VERSION).toBe('0.0.1');
    });
  });

  describe('array responses', () => {
    it('wraps an empty array with result: 0', async () => {
      expect(await runHandler([])).toEqual({
        apiversion: API_VERSION,
        result: 0,
        data: [],
      });
    });

    it('wraps a single-item array with result: 1', async () => {
      expect(await runHandler([{ id: 1 }])).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: [{ id: 1 }],
      });
    });

    it('wraps a multi-item array with result equal to its length', async () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
      expect(await runHandler(items)).toEqual({
        apiversion: API_VERSION,
        result: 4,
        data: items,
      });
    });

    it('does not mutate the original array', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      await runHandler(items);
      expect(items).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('single object responses', () => {
    it('wraps a plain POJO with result: 1 and preserves the object', async () => {
      const obj = { id: 1, email: 'a@b.com', firstName: 'Jane' };
      expect(await runHandler(obj)).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: obj,
      });
    });

    it('wraps a paginated wrapper object with result: 1 (no double-wrap)', async () => {
      const paginated = {
        data: [{ id: 1 }, { id: 2 }],
        meta: { total: 2, page: 1, limit: 10 },
      };
      expect(await runHandler(paginated)).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: paginated,
      });
    });

    it('does NOT treat a plain object with a numeric length property as an array', async () => {
      // Guard against accidental `.length`-based detection that would
      // mis-classify e.g. `{ id: 1, length: 7 }` as a 7-item array.
      const objLike = { id: 1, length: 7 };
      expect(await runHandler(objLike)).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: objLike,
      });
    });

    it('preserves deeply nested data without losing fields', async () => {
      const nested = {
        user: { id: 1, profile: { bio: 'hi', tags: ['x', 'y'] } },
        token: 'abc.def.ghi',
      };
      expect(await runHandler(nested)).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: nested,
      });
    });
  });

  describe('primitive responses', () => {
    it('wraps a string with result: 1', async () => {
      expect(await runHandler('Hello World!')).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: 'Hello World!',
      });
    });

    it('wraps a string that looks like a date with result: 1', async () => {
      // Strings have a `.length` property – make sure we still treat
      // them as a single primitive (not an array of characters).
      expect(await runHandler('2024-01-01')).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: '2024-01-01',
      });
    });

    it('wraps a finite number with result: 1', async () => {
      expect(await runHandler(42)).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: 42,
      });
    });

    it('wraps zero with result: 1 (zero is a valid primitive, not an empty array)', async () => {
      expect(await runHandler(0)).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: 0,
      });
    });

    it('wraps boolean true with result: 1', async () => {
      expect(await runHandler(true)).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: true,
      });
    });

    it('wraps boolean false with result: 1', async () => {
      expect(await runHandler(false)).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: false,
      });
    });
  });

  describe('null / undefined responses', () => {
    it('wraps null with result: 0 and data: null', async () => {
      expect(await runHandler(null)).toEqual({
        apiversion: API_VERSION,
        result: 0,
        data: null,
      });
    });

    it('wraps undefined with result: 0 and data: null', async () => {
      expect(await runHandler(undefined)).toEqual({
        apiversion: API_VERSION,
        result: 0,
        data: null,
      });
    });
  });

  describe('API version field', () => {
    it('always emits the configured API version (no typo)', async () => {
      // The legacy field name was `apiversrion` (transposed letters).
      // We expect the corrected spelling `apiversion` everywhere.
      const envelope: any = await runHandler({ ok: true });
      expect(envelope.apiversion).toBe(API_VERSION);
      expect(envelope.apiversrion).toBeUndefined();
    });
  });

  describe('RxJS / interceptor contract', () => {
    it('returns the envelope asynchronously', async () => {
      const envelope = await runHandler({ id: 9 });
      expect(envelope).toMatchObject({
        apiversion: API_VERSION,
        result: 1,
        data: { id: 9 },
      });
    });

    it('propagates to subscribers via Observable<Envelope>', async () => {
      const interceptor = new DataResponseInterceptor<number[]>();
      const handler: CallHandler<number[]> = { handle: () => of([1, 2, 3]) };
      const result$ = interceptor.intercept(buildContext(), handler);
      const collected: any[] = [];
      result$.subscribe((value) => collected.push(value));
      expect(collected).toEqual([
        { apiversion: API_VERSION, result: 3, data: [1, 2, 3] },
      ]);
    });

    it('is callable many times without leaking state', async () => {
      const interceptor = new DataResponseInterceptor();
      const handlerA: CallHandler = { handle: () => of([1, 2]) };
      const handlerB: CallHandler = { handle: () => of('a string') };
      const first = await lastValueFrom(
        interceptor.intercept(buildContext(), handlerA),
      );
      const second = await lastValueFrom(
        interceptor.intercept(buildContext(), handlerB),
      );
      expect(first).toEqual({
        apiversion: API_VERSION,
        result: 2,
        data: [1, 2],
      });
      expect(second).toEqual({
        apiversion: API_VERSION,
        result: 1,
        data: 'a string',
      });
    });
  });
});
