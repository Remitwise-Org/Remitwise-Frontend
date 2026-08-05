import { vi, expect, test, afterEach } from 'vitest';
import { errorReporter } from '../../lib/client/errorReporter';

afterEach(() => {
  vi.restoreAllMocks();
});

// NOTE: this was previously `jest.spyOn`, which threw `ReferenceError:
// jest is not defined` under this repo's Vitest runner (a leftover from
// before a Jest-to-Vitest migration) -- fixed alongside the tag feature
// this file now also covers.
test('reporter no-ops gracefully without DSN', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  errorReporter.captureException(new Error('test'));
  expect(consoleSpy).toHaveBeenCalled();
});

test('no-op reporter includes the scoped tag in the console output when provided', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  errorReporter.captureException(new Error('boom'), undefined, 'payout-form');

  expect(consoleSpy).toHaveBeenCalledWith(
    '[ErrorReporter No-Op]',
    '[payout-form]',
    expect.any(Error),
    { sessionId: expect.any(String) }
  );
});

test('no-op reporter omits the tag marker entirely when none is provided', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  errorReporter.captureException(new Error('boom'));

  expect(consoleSpy).toHaveBeenCalledWith('[ErrorReporter No-Op]', '', expect.any(Error), {
    sessionId: expect.any(String),
  });
});

test('every logged entry carries the same session ID across calls', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  errorReporter.captureException(new Error('first'));
  errorReporter.captureException(new Error('second'));

  const firstSessionId = consoleSpy.mock.calls[0][3].sessionId;
  const secondSessionId = consoleSpy.mock.calls[1][3].sessionId;
  expect(firstSessionId).toBe(secondSessionId);
});
