import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '../../../middleware';
import { isAdminAuthorized } from '../../../lib/admin/auth';

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  return NextResponse.json(metrics);
}
