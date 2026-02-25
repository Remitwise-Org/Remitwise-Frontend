import { NextResponse } from 'next/server'
import { buildCreateBillTx } from '../../../../lib/contracts/bill-payments'
import { StrKey } from '@stellar/stellar-sdk'
import { withApiLogger } from '@/lib/api-logger-middleware'

export const POST = withApiLogger(async (req) => {
  try {
    const caller = req.headers.get('x-user')
    if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
      return NextResponse.json({ error: 'Unauthorized: missing or invalid x-user header' }, { status: 401 })
    }

    const body = await req.json()
    const { name, amount, dueDate, recurring = false, frequencyDays } = body || {}

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }
    const numAmount = Number(amount)
    if (!(numAmount > 0)) {
      return NextResponse.json({ error: 'Invalid amount; must be > 0' }, { status: 400 })
    }
    if (recurring && !(frequencyDays && Number(frequencyDays) > 0)) {
      return NextResponse.json({ error: 'Invalid frequencyDays for recurring bill' }, { status: 400 })
    }
    if (!dueDate || Number.isNaN(Date.parse(dueDate))) {
      return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 })
    }

    const xdr = await buildCreateBillTx(caller, name, numAmount, dueDate, Boolean(recurring), frequencyDays ? Number(frequencyDays) : undefined)
    return NextResponse.json({ xdr })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
});
