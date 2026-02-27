import { NextResponse } from 'next/server'
import { getTranslator } from '../../../../../../lib/i18n'
import { buildPayPremiumTx } from '../../../../../../lib/contracts/insurance'
import { StrKey } from '@stellar/stellar-sdk'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const t = getTranslator(req.headers.get('accept-language'));

    const caller = req.headers.get('x-user')
    if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
      return NextResponse.json({ error: t('errors.unauthorized_missing_header') }, { status: 401 })
    }

    const { id: policyId } = await params;
    if (!policyId) return NextResponse.json({ error: t('errors.missing_policy_id') }, { status: 400 })

    const xdr = await buildPayPremiumTx(caller, policyId)
    return NextResponse.json({ xdr })
  } catch (err: any) {
    const t = getTranslator(req.headers.get('accept-language'));
    return NextResponse.json({ error: err?.message || t('errors.internal_server_error') }, { status: 500 })
  }
}
