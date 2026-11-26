import { NextRequest, NextResponse } from 'next/server';
import { verifyWalletSignature } from '@/lib/auth/verify-signature';
import { getSessionCookieHeader } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/verify
 * Verify a signature for authentication using Stellar SDK and establish a session.
 * 
 * Request Body:
 * - address: Stellar address
 * - signature: Signed nonce (base64)
 * - nonce: Original nonce (message)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address, signature, nonce } = body;

        // Map nonce to message for the shared verification routine
        const result = await verifyWalletSignature({
            address,
            message: nonce,
            signature,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: result.status }
            );
        }

        const response = NextResponse.json({
            success: true,
            address: result.address,
            expiresAt: result.expiresAt,
        });

        if (result.sealedSession) {
            response.headers.set(
                'Set-Cookie',
                getSessionCookieHeader(result.sealedSession)
            );
        }

        return response;
    } catch (error) {
        console.error('Error verifying signature:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
