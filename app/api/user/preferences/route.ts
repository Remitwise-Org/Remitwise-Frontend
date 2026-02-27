import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { validatePreferencesUpdate, ValidationError } from '@/utils/validation/preferences-validation';

export async function PATCH(request: NextRequest) {
  try {
    const { address } = await requireAuth();
    const body = await request.json();

    validatePreferencesUpdate(body);

    const user = await prisma.user.findUnique({
      where: { stellar_address: address },
      include: { preferences: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const updated = await prisma.userPreference.update({
      where: { userId: user.id },
      data: {
        ...body,
      },
    });

    return NextResponse.json({
      currency: updated.currency,
      language: updated.language,
      notifications_enabled: updated.notifications_enabled,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof Response) return error;

    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { address } = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { stellar_address: address },
      include: { preferences: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(user.preferences);
  } catch (error) {
    if (error instanceof Response) return error;

    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}