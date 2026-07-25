import { NextRequest } from 'next/server';
import crypto from 'crypto';

const ADMIN_COOKIE_NAMES = ['admin_key', 'admin_secret'];

function getConfiguredAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !secret.trim()) return null;
  return secret.trim();
}

function timingSafeEqual(a: string, b: string): boolean {
  try {
    // crypto.timingSafeEqual requires buffers of the same length.
    // This is a security best practice to avoid leaking length information.
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    // This will catch length mismatches or other errors, safely returning false.
    return false;
  }
}

export function isAdminAuthorized(request: NextRequest): boolean {
  const configuredSecret = getConfiguredAdminSecret();
  // If no secret is configured on the server, no request can be authorized.
  if (!configuredSecret) return false;

  const headerSecret = request.headers.get('x-admin-key')?.trim();
  if (headerSecret && timingSafeEqual(headerSecret, configuredSecret)) {
    return true;
  }

  for (const cookieName of ADMIN_COOKIE_NAMES) {
    const cookieValue = request.cookies.get(cookieName)?.value?.trim();
    if (cookieValue && timingSafeEqual(cookieValue, configuredSecret)) {
      return true;
    }
  }

  return false;
}

export function getAdminIdentity(request: NextRequest): string {
  const headerSecret = request.headers.get('x-admin-key')?.trim();
  if (headerSecret) return 'header:x-admin-key';

  for (const cookieName of ADMIN_COOKIE_NAMES) {
    const cookieValue = request.cookies.get(cookieName)?.value?.trim();
    if (cookieValue) return `cookie:${cookieName}`;
  }

  return 'unknown';
}
