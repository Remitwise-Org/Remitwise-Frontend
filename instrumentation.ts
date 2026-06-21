export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Existing session validation
    const { validateSessionConfig } = await import('./lib/session');
    validateSessionConfig();
    
    // Initialize Error Reporter
    console.log('Instrumentation: Error reporter initialized');
  }
}
