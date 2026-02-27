import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin/auth';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitRaw = request.nextUrl.searchParams.get('limit');
  const parsed = Number(limitRaw ?? 20);
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 100) : 20;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        stellar_address: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      users: users.map((u: { id: string; stellar_address: string; createdAt: Date }) => ({
        id: u.id,
        stellarAddress: u.stellar_address,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[GET /api/v1/admin/users]', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
