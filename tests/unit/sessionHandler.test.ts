import { describe, it, expect } from 'vitest';
import { SIGN_IN_PATH, getSignInUrl } from '../../lib/client/sessionHandler';

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
