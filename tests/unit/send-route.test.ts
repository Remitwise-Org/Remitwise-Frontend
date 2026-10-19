import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';

// Stub withAuth so it forwards the request and injects a fixed address
vi.mock('@/lib/auth', () => ({
    withAuth: (handler: (req: NextRequest, address: string) => Promise<Response>) =>
        (req: NextRequest) =>
            handler(req, 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
}));

import { POST } from '@/app/api/send/route';

const VALID_RECIPIENT = Keypair.random().publicKey();

function makePostRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/send', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('builds a transaction for a valid Stellar recipient', async () => {
        const res = await POST(
            makePostRequest({ recipient: VALID_RECIPIENT, amount: 100, currency: 'USDC' }),
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
    });

    it('rejects a recipient that is not a Stellar-shaped address at all', async () => {
        const res = await POST(
            makePostRequest({
                recipient: '0x71C7656EC7ab88b098defB751B7401B5f6d8976',
                amount: 100,
                currency: 'USDC',
            }),
        );
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/valid Stellar public key/);
    });

    it('rejects a structurally valid but bad-checksum recipient', async () => {
        const lastChar = VALID_RECIPIENT.at(-1);
        const badChecksum = `${VALID_RECIPIENT.slice(0, -1)}${lastChar === 'A' ? 'B' : 'A'}`;

        const res = await POST(
            makePostRequest({ recipient: badChecksum, amount: 100, currency: 'USDC' }),
        );
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/valid Stellar public key/);
    });

    it('still requires a non-empty recipient (existing check, unaffected)', async () => {
        const res = await POST(makePostRequest({ recipient: '', amount: 100, currency: 'USDC' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('recipient is required.');
    });
});
