import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '../../../middleware';

// Simple admin check (replace with real auth in production)
function isAdmin(request: NextRequest) {
  // Example: check for a header or session
  return request.headers.get('x-admin') === 'true';
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return NextResponse.json(metrics);
}
