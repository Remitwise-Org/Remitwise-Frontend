/**
 * Unit tests for session configuration handling
 * Tests Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { vi } from 'vitest';
import { validateSessionConfig } from '@/lib/session';

describe('Session Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateSessionConfig', () => {
    describe('SESSION_PASSWORD validation', () => {
      it('should throw error when SESSION_PASSWORD is not set', () => {
        delete process.env.SESSION_PASSWORD;
        
        expect(() => validateSessionConfig()).toThrow(
          'SESSION_PASSWORD must be set and at least 32 characters'
        );
      });

      it('should throw error when SESSION_PASSWORD is less than 32 characters', () => {
        process.env.SESSION_PASSWORD = 'short_password_123';
        
        expect(() => validateSessionConfig()).toThrow(
          'SESSION_PASSWORD must be set and at least 32 characters'
        );
      });

      it('should not throw when SESSION_PASSWORD is exactly 32 characters', () => {
        process.env.SESSION_PASSWORD = '12345678901234567890123456789012'; // 32 chars
        
        expect(() => validateSessionConfig()).not.toThrow();
      });

      it('should not throw when SESSION_PASSWORD is more than 32 characters', () => {
        process.env.SESSION_PASSWORD = 'a'.repeat(64);
        
        expect(() => validateSessionConfig()).not.toThrow();
      });
    });

    describe('SESSION_MAX_AGE validation', () => {
      beforeEach(() => {
        process.env.SESSION_PASSWORD = 'a'.repeat(32);
      });

      it('should log warning for invalid SESSION_MAX_AGE (non-numeric)', () => {
        process.env.SESSION_MAX_AGE = 'invalid';
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        validateSessionConfig();
        
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid SESSION_MAX_AGE value: invalid')
        );
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('using default 7 days (604800 seconds)')
        );
        warnSpy.mockRestore();
      });

      it('should log warning for invalid SESSION_MAX_AGE (negative)', () => {
        process.env.SESSION_MAX_AGE = '-100';
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        validateSessionConfig();
        
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid SESSION_MAX_AGE value: -100')
        );
        warnSpy.mockRestore();
      });

      it('should log warning for invalid SESSION_MAX_AGE (zero)', () => {
        process.env.SESSION_MAX_AGE = '0';
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        validateSessionConfig();
        
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid SESSION_MAX_AGE value: 0')
        );
        warnSpy.mockRestore();
      });

      it('should not log warning for valid SESSION_MAX_AGE', () => {
        process.env.SESSION_MAX_AGE = '3600';
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        validateSessionConfig();
        
        expect(warnSpy).not.toHaveBeenCalled();
        warnSpy.mockRestore();
      });

      it('should not log warning when SESSION_MAX_AGE is not set', () => {
        delete process.env.SESSION_MAX_AGE;
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        validateSessionConfig();
        
        expect(warnSpy).not.toHaveBeenCalled();
        warnSpy.mockRestore();
      });
    });

    describe('SESSION_REFRESH_ENABLED logging', () => {
      beforeEach(() => {
        process.env.SESSION_PASSWORD = 'a'.repeat(32);
      });

      it('should log info when SESSION_REFRESH_ENABLED is true', () => {
        process.env.SESSION_REFRESH_ENABLED = 'true';
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        validateSessionConfig();
        
        expect(infoSpy).toHaveBeenCalledWith(
          'Session refresh enabled: sliding window refresh is active'
        );
        infoSpy.mockRestore();
      });

      it('should log info when SESSION_REFRESH_ENABLED is false', () => {
        process.env.SESSION_REFRESH_ENABLED = 'false';
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        validateSessionConfig();
        
        expect(infoSpy).toHaveBeenCalledWith(
          'Session refresh disabled: sessions will not auto-extend'
        );
        infoSpy.mockRestore();
      });

      it('should log disabled info when SESSION_REFRESH_ENABLED is not set', () => {
        delete process.env.SESSION_REFRESH_ENABLED;
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        validateSessionConfig();
        
        expect(infoSpy).toHaveBeenCalledWith(
          'Session refresh disabled: sessions will not auto-extend'
        );
        infoSpy.mockRestore();
      });

      it('should log disabled info when SESSION_REFRESH_ENABLED is invalid value', () => {
        process.env.SESSION_REFRESH_ENABLED = 'yes';
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        validateSessionConfig();
        
        expect(infoSpy).toHaveBeenCalledWith(
          'Session refresh disabled: sessions will not auto-extend'
        );
        infoSpy.mockRestore();
      });
    });

    describe('Combined configuration scenarios', () => {
      it('should handle all valid configuration', () => {
        process.env.SESSION_PASSWORD = 'a'.repeat(32);
        process.env.SESSION_MAX_AGE = '86400';
        process.env.SESSION_REFRESH_ENABLED = 'true';
        
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        expect(() => validateSessionConfig()).not.toThrow();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalledWith(
          'Session refresh enabled: sliding window refresh is active'
        );
        
        warnSpy.mockRestore();
        infoSpy.mockRestore();
      });

      it('should handle defaults when optional vars not set', () => {
        process.env.SESSION_PASSWORD = 'a'.repeat(32);
        delete process.env.SESSION_MAX_AGE;
        delete process.env.SESSION_REFRESH_ENABLED;
        
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        expect(() => validateSessionConfig()).not.toThrow();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalledWith(
          'Session refresh disabled: sessions will not auto-extend'
        );
        
        warnSpy.mockRestore();
        infoSpy.mockRestore();
      });

      it('should handle mixed valid and invalid configuration', () => {
        process.env.SESSION_PASSWORD = 'a'.repeat(32);
        process.env.SESSION_MAX_AGE = 'invalid';
        process.env.SESSION_REFRESH_ENABLED = 'true';
        
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        
        expect(() => validateSessionConfig()).not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid SESSION_MAX_AGE')
        );
        expect(infoSpy).toHaveBeenCalledWith(
          'Session refresh enabled: sliding window refresh is active'
        );
        
        warnSpy.mockRestore();
        infoSpy.mockRestore();
      });
    });
  });
});
