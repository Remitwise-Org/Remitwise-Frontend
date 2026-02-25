import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withApiLogger } from '@/lib/api-logger-middleware';

export const GET = withApiLogger(async () => {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie || sessionCookie.value !== 'mock-session-cookie') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        allocations: {
            dailySpending: 50,
            savings: 30,
            bills: 15,
            insurance: 5
        }
    });
});
