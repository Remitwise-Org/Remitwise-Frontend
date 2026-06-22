import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';

import { getAdminIdentity, isAdminAuthorized } from '@/lib/admin/auth';

type AdminRequestOptions = {
  header?: string;
  cookies?: Record<string, string>;
};

const originalAdminSecret = process.env.ADMIN_SECRET;

function makeAdminRequest({ header, cookies = {} }: AdminRequestOptions = {}): NextRequest {
  const headers = new Headers();
  if (header !== undefined) headers.set('x-admin-key', header);

  return {
    headers,
    cookies: {
      get(name: string) {
        const value = cookies[name];
        return value === undefined ? undefined : { value };
      },
    },
  } as unknown as NextRequest;
}

describe('admin auth guard', () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = 'correct-admin-secret';
  });

  afterEach(() => {
    if (originalAdminSecret === undefined) {
      delete process.env.ADMIN_SECRET;
    } else {
      process.env.ADMIN_SECRET = originalAdminSecret;
    }
  });

  describe('isAdminAuthorized', () => {
    it('authorizes a request with the correct x-admin-key header', () => {
      const request = makeAdminRequest({ header: 'correct-admin-secret' });

      expect(isAdminAuthorized(request)).toBe(true);
    });

    it('authorizes a request with the correct admin_key cookie', () => {
      const request = makeAdminRequest({
        cookies: { admin_key: 'correct-admin-secret' },
      });

      expect(isAdminAuthorized(request)).toBe(true);
    });

    it('authorizes a request with the correct admin_secret cookie', () => {
      const request = makeAdminRequest({
        cookies: { admin_secret: 'correct-admin-secret' },
      });

      expect(isAdminAuthorized(request)).toBe(true);
    });

    it('authorizes when the header is wrong but a supported cookie is correct', () => {
      const request = makeAdminRequest({
        header: 'wrong-admin-secret',
        cookies: { admin_secret: 'correct-admin-secret' },
      });

      expect(isAdminAuthorized(request)).toBe(true);
    });

    it('denies a request with the wrong key', () => {
      const request = makeAdminRequest({ header: 'wrong-admin-secret' });

      expect(isAdminAuthorized(request)).toBe(false);
    });

    it('denies a request with no presented key', () => {
      expect(isAdminAuthorized(makeAdminRequest())).toBe(false);
    });

    it('denies every request when ADMIN_SECRET is unset', () => {
      delete process.env.ADMIN_SECRET;

      expect(isAdminAuthorized(makeAdminRequest({ header: 'correct-admin-secret' }))).toBe(false);
      expect(
        isAdminAuthorized(makeAdminRequest({ cookies: { admin_key: 'correct-admin-secret' } })),
      ).toBe(false);
    });

    it('denies every request when ADMIN_SECRET is whitespace only', () => {
      process.env.ADMIN_SECRET = '   ';

      expect(isAdminAuthorized(makeAdminRequest({ header: '' }))).toBe(false);
      expect(isAdminAuthorized(makeAdminRequest({ header: '   ' }))).toBe(false);
      expect(isAdminAuthorized(makeAdminRequest({ cookies: { admin_key: '   ' } }))).toBe(false);
    });

    it('returns false instead of throwing when the presented key length differs', () => {
      const request = makeAdminRequest({ header: 'short' });

      expect(() => isAdminAuthorized(request)).not.toThrow();
      expect(isAdminAuthorized(request)).toBe(false);
    });
  });

  describe('getAdminIdentity', () => {
    it('identifies an authorized header request', () => {
      const request = makeAdminRequest({ header: 'correct-admin-secret' });

      expect(isAdminAuthorized(request)).toBe(true);
      expect(getAdminIdentity(request)).toBe('header:x-admin-key');
    });

    it('identifies an authorized cookie request', () => {
      const request = makeAdminRequest({
        cookies: { admin_secret: 'correct-admin-secret' },
      });

      expect(isAdminAuthorized(request)).toBe(true);
      expect(getAdminIdentity(request)).toBe('cookie:admin_secret');
    });

    it('returns unknown when an unauthorized request has no presented credentials', () => {
      const request = makeAdminRequest();

      expect(isAdminAuthorized(request)).toBe(false);
      expect(getAdminIdentity(request)).toBe('unknown');
    });
  });
});
