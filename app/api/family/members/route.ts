import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import { getAllMembers, buildAddMemberTx } from '@/lib/contracts/family-wallet';
import { resolveContractId } from '@/lib/contracts/network-resolution';

// ---------------------------------------------------------------------------
// Zod schema for AddMemberRequest body validation
// ---------------------------------------------------------------------------

const AddMemberSchema = z.object({
    address: z
        .string()
        .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar address format'),
    role: z.enum(['admin', 'sender', 'recipient'], {
        errorMap: () => ({ message: 'Role must be admin, sender, or recipient' }),
    }),
    spendingLimit: z
        .number({ invalid_type_error: 'spendingLimit must be a number' })
        .nonnegative('spendingLimit must be non-negative'),
});

// ---------------------------------------------------------------------------
// Contract-id guard — returns a 503 response if the contract is unresolved
// ---------------------------------------------------------------------------

function getContractIdOrError(): NextResponse | null {
    try {
        resolveContractId('FAMILY_WALLET');
        return null;
    } catch {
        return NextResponse.json(
            {
                error: 'Service Unavailable',
                message: 'Family wallet contract ID is not configured for this network.',
            },
            { status: 503 },
        );
    }
}

// ---------------------------------------------------------------------------
// GET /api/family/members
// ---------------------------------------------------------------------------

/**
 * GET /api/family/members
 *
 * Returns the list of family members for the authenticated user.
 * Optionally accepts `?admin=<stellarAddress>` to filter by admin.
 *
 * Responses:
 *   200 – { members: FamilyMember[] }
 *   401 – Unauthorized (no valid session)
 *   503 – Contract not configured on this network
 *   500 – Unexpected server error
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
    const contractError = getContractIdOrError();
    if (contractError) return contractError;

    const adminAddress = request.nextUrl.searchParams.get('admin') ?? undefined;
    const members = await getAllMembers(adminAddress);
    return NextResponse.json({ members });
}

export const GET = withAuth(async (request: NextRequest) =>
    getHandler(request),
) as (request: NextRequest) => Promise<NextResponse>;

// ---------------------------------------------------------------------------
// POST /api/family/members
// ---------------------------------------------------------------------------

/**
 * POST /api/family/members
 *
 * Builds a Stellar transaction XDR to add a new family member.
 * The caller must sign and submit the returned XDR.
 *
 * Request body (JSON): { address, role, spendingLimit }
 *
 * Responses:
 *   200 – { transactionXdr: string, message: string }
 *   400 – Validation error
 *   401 – Unauthorized (no valid session)
 *   503 – Contract not configured on this network
 *   500 – Unexpected server error
 */
async function postHandler(
    request: NextRequest,
    adminAddress: string,
): Promise<NextResponse> {
    const contractError = getContractIdOrError();
    if (contractError) return contractError;

    let rawBody: unknown;
    try {
        rawBody = await request.json();
    } catch {
        return NextResponse.json(
            { error: 'Bad Request', message: 'Request body must be valid JSON' },
            { status: 400 },
        );
    }

    const parseResult = AddMemberSchema.safeParse(rawBody);
    if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => i.message).join('; ');
        return NextResponse.json(
            { error: 'Validation Error', message: issues },
            { status: 400 },
        );
    }

    const { address, role, spendingLimit } = parseResult.data;
    const transactionXdr = await buildAddMemberTx(
        adminAddress,
        address,
        role,
        spendingLimit,
    );

    return NextResponse.json({
        transactionXdr,
        message: 'Transaction built successfully. Sign and submit to add member.',
    });
}

export const POST = withAuth(async (request: NextRequest, address: string) =>
    postHandler(request, address),
) as (request: NextRequest) => Promise<NextResponse>;
