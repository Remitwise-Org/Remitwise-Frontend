import { NextRequest, NextResponse } from 'next/server';
import { buildUpdateSpendingLimitTx } from '@/lib/contracts/family-wallet';
import { UpdateSpendingLimitRequest } from '@/utils/types/family-wallet.types';

/**
 * PATCH /api/family/members/[id]/limit
 * Update a member's spending limit
 * Protected: Requires admin authentication
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // TODO: Get session/auth from request
        // const session = await getSession(request);
        // if (!session) {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }
        // if (session.role !== 'admin') {
        //   return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
        // }

        const { id } = await params;

        // Contract not yet deployed - return 501
        return NextResponse.json(
            {
                error: 'Not Implemented',
                message: 'Family wallet contract not yet deployed. This endpoint will be available once the contract is deployed.',
                documentation: 'Use buildUpdateSpendingLimitTx(callerAddress, memberId, newLimit) from lib/contracts/family-wallet.ts'
            },
            { status: 501 }
        );

        // TODO: Uncomment when contract is deployed
        // const body: UpdateSpendingLimitRequest = await request.json();
        //
        // // Validate request body
        // if (body.limit === undefined || body.limit === null) {
        //   return NextResponse.json(
        //     { error: 'Missing required field: limit' },
        //     { status: 400 }
        //   );
        // }
        //
        // // Validate spending limit
        // if (body.limit < 0) {
        //   return NextResponse.json(
        //     { error: 'Spending limit must be non-negative' },
        //     { status: 400 }
        //   );
        // }
        //
        // const txXdr = await buildUpdateSpendingLimitTx(
        //   session.address,
        //   id,
        //   body.limit
        // );
        //
        // return NextResponse.json({
        //   transactionXdr: txXdr,
        //   message: 'Transaction built successfully. Sign and submit to update spending limit.'
        // });

    } catch (error) {
        console.error('Error updating spending limit:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
