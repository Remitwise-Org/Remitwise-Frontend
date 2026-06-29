import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks – must be declared before any import of the module under test
// ---------------------------------------------------------------------------

const mockGetAllMembers = vi.hoisted(() => vi.fn());
const mockBuildAddMemberTx = vi.hoisted(() => vi.fn());
const mockResolveContractId = vi.hoisted(() => vi.fn());

vi.mock('@/lib/contracts/family-wallet', () => ({
    getAllMembers: mockGetAllMembers,
    buildAddMemberTx: mockBuildAddMemberTx,
}));

vi.mock('@/lib/contracts/network-resolution', () => ({
    resolveContractId: mockResolveContractId,
}));

// Stub withAuth so it forwards the request and injects a fixed address
vi.mock('@/lib/auth', () => ({
    withAuth: (handler: (req: NextRequest, address: string) => Promise<Response>) =>
        (req: NextRequest) => {
            const authHeader = req.headers.get('authorization') ?? '';
            if (!authHeader.startsWith('Bearer ')) {
                return Promise.resolve(
                    new Response(JSON.stringify({ error: 'Unauthorized' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    }),
                );
            }
            return handler(req, 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        },
}));

// Import after mocks are registered
import { GET, POST } from '@/app/api/family/members/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_ADMIN = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const VALID_MEMBER = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

function makeGetRequest(opts: { auth?: boolean; admin?: string } = {}): NextRequest {
    const url = new URL('http://localhost/api/family/members');
    if (opts.admin) url.searchParams.set('admin', opts.admin);
    const headers: HeadersInit = opts.auth !== false ? { authorization: 'Bearer token' } : {};
    return new NextRequest(url.toString(), { method: 'GET', headers });
}

function makePostRequest(body: unknown, auth = true): NextRequest {
    const headers: HeadersInit = {
        'content-type': 'application/json',
        ...(auth ? { authorization: 'Bearer token' } : {}),
    };
    return new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/family/members', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when no auth header is provided', async () => {
        const res = await GET(makeGetRequest({ auth: false }));
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('Unauthorized');
    });

    it('returns 503 when the contract id is not configured', async () => {
        mockResolveContractId.mockImplementation(() => {
            throw new Error('Missing contract ID');
        });

        const res = await GET(makeGetRequest());
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.error).toBe('Service Unavailable');
    });

    it('returns 200 with members list for authenticated request', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');
        const mockMembers = [
            { id: '1', address: VALID_MEMBER, role: 'recipient', spendingLimit: 500 },
        ];
        mockGetAllMembers.mockResolvedValue(mockMembers);

        const res = await GET(makeGetRequest());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.members).toEqual(mockMembers);
    });

    it('passes the admin query param to getAllMembers', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');
        mockGetAllMembers.mockResolvedValue([]);

        await GET(makeGetRequest({ admin: VALID_ADMIN }));
        expect(mockGetAllMembers).toHaveBeenCalledWith(VALID_ADMIN);
    });

    it('calls getAllMembers without admin when no query param', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');
        mockGetAllMembers.mockResolvedValue([]);

        await GET(makeGetRequest());
        expect(mockGetAllMembers).toHaveBeenCalledWith(undefined);
    });
});

describe('POST /api/family/members', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when no auth header is provided', async () => {
        const res = await POST(makePostRequest({ address: VALID_MEMBER, role: 'recipient', spendingLimit: 100 }, false));
        expect(res.status).toBe(401);
    });

    it('returns 503 when the contract id is not configured', async () => {
        mockResolveContractId.mockImplementation(() => {
            throw new Error('Missing contract ID');
        });

        const res = await POST(makePostRequest({ address: VALID_MEMBER, role: 'recipient', spendingLimit: 100 }));
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.error).toBe('Service Unavailable');
    });

    it('returns 400 for missing required fields', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');

        const res = await POST(makePostRequest({ address: VALID_MEMBER }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Validation Error');
    });

    it('returns 400 for invalid Stellar address format', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');

        const res = await POST(makePostRequest({ address: 'not-a-stellar-address', role: 'recipient', spendingLimit: 100 }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Validation Error');
    });

    it('returns 400 for invalid role', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');

        const res = await POST(makePostRequest({ address: VALID_MEMBER, role: 'owner', spendingLimit: 100 }));
        expect(res.status).toBe(400);
    });

    it('returns 400 for negative spendingLimit', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');

        const res = await POST(makePostRequest({ address: VALID_MEMBER, role: 'recipient', spendingLimit: -1 }));
        expect(res.status).toBe(400);
    });

    it('returns 200 with transactionXdr for valid add-member request', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');
        mockBuildAddMemberTx.mockResolvedValue('AAAA...XDR...');

        const res = await POST(makePostRequest({ address: VALID_MEMBER, role: 'sender', spendingLimit: 200 }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.transactionXdr).toBe('AAAA...XDR...');
        expect(body.message).toContain('Transaction built successfully');
    });

    it('calls buildAddMemberTx with correct args', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');
        mockBuildAddMemberTx.mockResolvedValue('XDR_STRING');

        await POST(makePostRequest({ address: VALID_MEMBER, role: 'admin', spendingLimit: 1000 }));

        expect(mockBuildAddMemberTx).toHaveBeenCalledWith(
            VALID_ADMIN,
            VALID_MEMBER,
            'admin',
            1000,
        );
    });

    it('returns 400 when request body is not valid JSON', async () => {
        mockResolveContractId.mockReturnValue('CCONTRACT123');

        const req = new NextRequest('http://localhost/api/family/members', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: 'Bearer token' },
            body: 'not json {',
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Bad Request');
    });
});
