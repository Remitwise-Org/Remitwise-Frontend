import { NextRequest, NextResponse } from 'next/server';
import { getMember } from '@/lib/contracts/family-wallet';

/**
 * GET /api/family/members/[id]
 * Get a specific family member by ID
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

        // Contract not yet deployed - return 501
        return NextResponse.json(
            {
                error: 'Not Implemented',
                message: 'Family wallet contract not yet deployed. This endpoint will be available once the contract is deployed.',
                documentation: 'Use getMember(id) from lib/contracts/family-wallet.ts'
            },
            { status: 501 }
        );

        // TODO: Uncomment when contract is deployed
        // const member = await getMember(id);
        // 
        // if (!member) {
        //   return NextResponse.json(
        //     { error: 'Member not found' },
        //     { status: 404 }
        //   );
        // }
        //
        // return NextResponse.json({ member });

    } catch (error) {
        console.error('Error fetching family member:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
