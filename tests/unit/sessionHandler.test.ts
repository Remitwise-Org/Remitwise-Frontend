import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SIGN_IN_PATH,
  getSignInUrl,
  wipeClientState,
  AUTH_STORAGE_KEYS,
  FORM_STATE_PREFIX,
  SESSION_STORAGE_FORM_KEYS,
} from '../../lib/client/sessionHandler';

describe('SIGN_IN_PATH', () => {
  it('should be the root path', () => {
    expect(SIGN_IN_PATH).toBe('/');
  });
});

describe('getSignInUrl', () => {
  it('returns the sign-in path alone when no intendedPath is given', () => {
    expect(getSignInUrl()).toBe('/');
  });

  it('returns the sign-in path alone for root intendedPath', () => {
    expect(getSignInUrl('/')).toBe('/');
  });

  it('includes ?next= with the encoded intendedPath', () => {
    const url = getSignInUrl('/dashboard');
    expect(url).toBe('/?next=%2Fdashboard');
  });

  it('encodes special characters in the intendedPath', () => {
    const url = getSignInUrl('/send?amount=100');
    expect(url).toBe('/?next=%2Fsend%3Famount%3D100');
  });

  it('encodes a path with spaces', () => {
    const url = getSignInUrl('/my profile');
    expect(url).toBe('/?next=%2Fmy%20profile');
  });
});

// ---------------------------------------------------------------------------
// wipeClientState — Issue #1430: wipe form state on logout
// ---------------------------------------------------------------------------

describe('wipeClientState', () => {
  let lsStore: Record<string, string>;
  let ssStore: Record<string, string>;

  beforeEach(() => {
    lsStore = {};
    ssStore = {};

    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      get length() { return Object.keys(lsStore).length; },
      getItem: (k: string) => lsStore[k] ?? null,
      setItem: (k: string, v: string) => { lsStore[k] = v; },
      removeItem: (k: string) => { delete lsStore[k]; },
      key: (i: number) => Object.keys(lsStore)[i] ?? null,
      clear: () => { lsStore = {}; },
    });
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => ssStore[k] ?? null,
      setItem: (k: string, v: string) => { ssStore[k] = v; },
      removeItem: (k: string) => { delete ssStore[k]; },
      clear: () => { ssStore = {}; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes every known auth key from localStorage', () => {
    for (const key of AUTH_STORAGE_KEYS) {
      lsStore[key] = 'some-value';
    }

    wipeClientState();

    for (const key of AUTH_STORAGE_KEYS) {
      expect(lsStore[key]).toBeUndefined();
    }
  });

  it('removes localStorage keys that start with the form-state prefix', () => {
    lsStore[`${FORM_STATE_PREFIX}send`] = 'draft-data';
    lsStore[`${FORM_STATE_PREFIX}bill_42`] = 'bill-draft';
    lsStore['unrelated_key'] = 'keep-me';

    wipeClientState();

    expect(lsStore[`${FORM_STATE_PREFIX}send`]).toBeUndefined();
    expect(lsStore[`${FORM_STATE_PREFIX}bill_42`]).toBeUndefined();
    // Unrelated keys must not be touched
    expect(lsStore['unrelated_key']).toBe('keep-me');
  });

  it('removes known sessionStorage draft keys', () => {
    for (const key of SESSION_STORAGE_FORM_KEYS) {
      ssStore[key] = 'draft';
    }

    wipeClientState();

    for (const key of SESSION_STORAGE_FORM_KEYS) {
      expect(ssStore[key]).toBeUndefined();
    }
  });

  it('is a no-op when storage is already empty', () => {
    // Must not throw
    expect(() => wipeClientState()).not.toThrow();
  });

  it('does not remove unrelated localStorage keys', () => {
    lsStore['theme'] = 'dark';
    lsStore['locale'] = 'en';

    wipeClientState();

    expect(lsStore['theme']).toBe('dark');
    expect(lsStore['locale']).toBe('en');
  });
});
