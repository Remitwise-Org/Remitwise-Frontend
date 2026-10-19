import { NextRequest, NextResponse } from 'next/server';
import { checkSpendingLimit } from '@/lib/contracts/family-wallet';

/**
 * GET /api/family/members/[id]/check?amount=...
 * Check if a member can spend a specific amount
 * Protected: Requires authentication
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // TODO: Get session/auth from request
        // const session = await getSession(request);
        // if (!session) {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const { id } = await params;
        const amount = request.nextUrl.searchParams.get('amount');

        // Contract not yet deployed - return 501
        return NextResponse.json(
            {
                error: 'Not Implemented',
                message: 'Family wallet contract not yet deployed. This endpoint will be available once the contract is deployed.',
                documentation: 'Use checkSpendingLimit(memberId, amount) from lib/contracts/family-wallet.ts'
            },
            { status: 501 }
        );

        // TODO: Uncomment when contract is deployed
        // // Validate amount parameter
        // if (!amount) {
        //   return NextResponse.json(
        //     { error: 'Missing required query parameter: amount' },
        //     { status: 400 }
        //   );
        // }
        //
        // const amountNum = parseFloat(amount);
        // if (isNaN(amountNum) || amountNum < 0) {
        //   return NextResponse.json(
        //     { error: 'Invalid amount. Must be a non-negative number' },
        //     { status: 400 }
        //   );
        // }
        //
        // const result = await checkSpendingLimit(id, amountNum);
        // return NextResponse.json(result);

    } catch (error) {
        console.error('Error checking spending limit:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
