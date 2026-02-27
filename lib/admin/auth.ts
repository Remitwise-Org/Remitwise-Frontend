import { NextRequest } from 'next/server';

const ADMIN_COOKIE_NAMES = ['admin_key', 'admin_secret'];

function getConfiguredAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !secret.trim()) return null;
  return secret.trim();
}

export function isAdminAuthorized(request: NextRequest): boolean {
  const configuredSecret = getConfiguredAdminSecret();
  if (!configuredSecret) return false;

  const headerSecret = request.headers.get('x-admin-key')?.trim();
  if (headerSecret && headerSecret === configuredSecret) return true;

  for (const cookieName of ADMIN_COOKIE_NAMES) {
    const cookieValue = request.cookies.get(cookieName)?.value?.trim();
    if (cookieValue && cookieValue === configuredSecret) return true;
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

