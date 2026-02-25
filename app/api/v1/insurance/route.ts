import { NextResponse } from 'next/server'
import { buildCreatePolicyTx } from '../../../../lib/contracts/insurance'
import { StrKey } from '@stellar/stellar-sdk'
import { withApiLogger } from '@/lib/api-logger-middleware'

export const POST = withApiLogger(async (req) => {
  try {
    const caller = req.headers.get('x-user')
    if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
      return NextResponse.json({ error: 'Unauthorized: missing or invalid x-user header' }, { status: 401 })
    }

    const body = await req.json()
    const { name, coverageType, monthlyPremium, coverageAmount } = body || {}

    if (!name || typeof name !== 'string') return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    if (!coverageType || typeof coverageType !== 'string') return NextResponse.json({ error: 'Invalid coverageType' }, { status: 400 })

    const mp = Number(monthlyPremium)
    const ca = Number(coverageAmount)
    if (!(mp > 0)) return NextResponse.json({ error: 'Invalid monthlyPremium; must be > 0' }, { status: 400 })
    if (!(ca > 0)) return NextResponse.json({ error: 'Invalid coverageAmount; must be > 0' }, { status: 400 })

    const xdr = await buildCreatePolicyTx(caller, name, coverageType, mp, ca)
    return NextResponse.json({ xdr })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
});
