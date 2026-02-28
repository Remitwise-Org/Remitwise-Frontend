import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/user/deactivate
 * Soft-delete (deactivate) the current user account
 * Sets deletedAt timestamp without removing data
 */
export async function POST() {
  try {
    const { address } = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { stellar_address: address },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if already deactivated
    if (user.deletedAt) {
      return NextResponse.json(
        { error: 'USER_ALREADY_DEACTIVATED' },
        { status: 400 }
      );
    }

    // Soft delete by setting deletedAt timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: 'Account deactivated successfully',
      deactivatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Response) return error;

    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
