import { NextResponse } from 'next/server'
import { buildCancelBillTx } from '../../../../../../lib/contracts/bill-payments'
import { StrKey } from '@stellar/stellar-sdk'
import { withApiLogger } from '@/lib/api-logger-middleware'

export const POST = withApiLogger(async (req, context) => {
  const { id } = await context.params! as unknown as { id: string };
  try {
    const caller = req.headers.get('x-user')
    if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
      return NextResponse.json({ error: 'Unauthorized: missing or invalid x-user header' }, { status: 401 })
    }

    const billId = id
    if (!billId) return NextResponse.json({ error: 'Missing bill id' }, { status: 400 })

    // If the contract enforces owner-only cancel, the client should provide an `x-owner` header
    // and the server will enforce it. If not provided, we allow the caller to request cancellation.
    const ownerOnly = req.headers.get('x-owner-only') === '1'
    const ownerHdr = req.headers.get('x-owner')
    if (ownerOnly) {
      if (!ownerHdr || ownerHdr !== caller) {
        return NextResponse.json({ error: 'Forbidden: only owner can cancel' }, { status: 403 })
      }
    }

    const xdr = await buildCancelBillTx(caller, billId)
    return NextResponse.json({ xdr })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
});
