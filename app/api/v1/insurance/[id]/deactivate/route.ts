import { NextResponse } from 'next/server'
import { buildDeactivatePolicyTx } from '../../../../../../lib/contracts/insurance'
import { StrKey } from '@stellar/stellar-sdk'
import { withApiLogger } from '@/lib/api-logger-middleware'

export const POST = withApiLogger(async (req, context) => {
  const { id } = await context.params! as unknown as { id: string };
  try {
    const caller = req.headers.get('x-user')
    if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
      return NextResponse.json({ error: 'Unauthorized: missing or invalid x-user header' }, { status: 401 })
    }

    const policyId = id
    if (!policyId) return NextResponse.json({ error: 'Missing policy id' }, { status: 400 })

    // Optional owner-only enforcement can be handled by headers similar to bills
    const ownerOnly = req.headers.get('x-owner-only') === '1'
    const ownerHdr = req.headers.get('x-owner')
    if (ownerOnly) {
      if (!ownerHdr || ownerHdr !== caller) {
        return NextResponse.json({ error: 'Forbidden: only owner can deactivate' }, { status: 403 })
      }
    }

    const xdr = await buildDeactivatePolicyTx(caller, policyId)
    return NextResponse.json({ xdr })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
});
