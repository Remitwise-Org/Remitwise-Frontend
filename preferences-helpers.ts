import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/prisma';

/** Hydrate the locale cookie from saved preferences on profile load. */
export async function setLocaleFromPreferences(request: NextRequest) {
  try {
    const { address } = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { stellar_address: address },
      include: { preferences: true },
    });
    if (user?.preferences?.language) {
      const response = NextResponse.json({ hydrated: true });
      response.cookies.set('remitwise_locale', user.preferences.language, {
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
        sameSite: 'lax',
        httpOnly: false,
      });
      return response;
    }
    return NextResponse.json({ hydrated: false });
  } catch {
    return NextResponse.json({ hydrated: false }, { status: 500 });
  }
}