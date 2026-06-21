import { errorReporter } from '../../lib/client/errorReporter';

test('reporter no-ops gracefully without DSN', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  errorReporter.captureException(new Error('test'));
  expect(consoleSpy).toHaveBeenCalled();
  consoleSpy.mockRestore();
});
