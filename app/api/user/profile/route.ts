
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { address } = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { stellar_address: address },
      include: { preferences: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      address: user.stellar_address,
      preferences: {
        currency: user.preferences?.currency ?? 'USD',
        language: user.preferences?.language ?? 'en',
        notifications_enabled:
          user.preferences?.notifications_enabled ?? true,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

async function handler(request: NextRequest, session: string) {
  // TODO: Fetch user profile from database using session
  return NextResponse.json({ 
    publicKey: session,
    // Add other profile fields
  });
}

export const GET = withAuth(handler);
