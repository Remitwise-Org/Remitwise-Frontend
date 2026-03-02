import { NextResponse } from 'next/server'
import { getTranslator } from '../../../../../../lib/i18n'
import { buildCancelBillTx } from '../../../../../../lib/contracts/bill-payments'
import { StrKey } from '@stellar/stellar-sdk'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const t = getTranslator(req.headers.get('accept-language'));

    const caller = req.headers.get('x-user')
    if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
      return NextResponse.json({ error: t('errors.unauthorized_missing_header') }, { status: 401 })
    }

    const { id: billId } = await params;
    if (!billId) return NextResponse.json({ error: t('errors.missing_bill_id') }, { status: 400 })

    // If the contract enforces owner-only cancel, the client should provide an `x-owner` header
    // and the server will enforce it. If not provided, we allow the caller to request cancellation.
    const ownerOnly = req.headers.get('x-owner-only') === '1'
    const ownerHdr = req.headers.get('x-owner')
    if (ownerOnly) {
      if (!ownerHdr || ownerHdr !== caller) {
        return NextResponse.json({ error: t('errors.forbidden_owner_cancel') }, { status: 403 })
      }
    }

    const xdr = await buildCancelBillTx(caller, billId)
    return NextResponse.json({ xdr })
  } catch (err: any) {
    const t = getTranslator(req.headers.get('accept-language'));
    return NextResponse.json({ error: err?.message || t('errors.internal_server_error') }, { status: 500 })
  }
}
