import * as Sentry from '@sentry/nextjs';

jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
}));

describe('sentry.edge.config', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should scrub PII from edge Sentry events', async () => {
    // Import the edge config to trigger Sentry.init
    await import('../../sentry.edge.config');

    // Assert Sentry.init was called
    expect(Sentry.init).toHaveBeenCalled();
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];

    // Assert that beforeSend is defined
    expect(config.beforeSend).toBeDefined();

    // Create a mock event containing PII
    const mockEvent = {
      message: 'User GABCDEFGHIJKLMNOPQRSTUVWXYZ234567 deposited 100 USDC',
      request: {
        headers: {
          cookie: '"iron-session-v2": "secret-token-123"',
        }
      }
    };

    // Scrub the event using the beforeSend hook
    const scrubbedEvent = config.beforeSend(mockEvent as any);
    const scrubbedStr = JSON.stringify(scrubbedEvent);

    // Verify PII is removed
    expect(scrubbedStr).not.toContain('GABCDEFGHIJKLMNOPQRSTUVWXYZ234567');
    expect(scrubbedStr).toContain('[STELLAR_ADDRESS]');

    expect(scrubbedStr).not.toContain('100 USDC');
    expect(scrubbedStr).toContain('[AMOUNT]');

    expect(scrubbedStr).not.toContain('secret-token-123');
    expect(scrubbedStr).toContain('[REDACTED]');
  });
});
