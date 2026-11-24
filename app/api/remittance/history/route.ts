import type { NextRequest } from 'next/server';
import { GET as getV1History } from '@/app/api/v1/remittance/history/route';

export async function GET(request: NextRequest) {
  return getV1History(request);
}
