import { NextResponse } from 'next/server'
import { getTranslator } from '../../../../../../lib/i18n'
import { buildPayBillTx } from '../../../../../../lib/contracts/bill-payments'
import { StrKey } from '@stellar/stellar-sdk'
import { ApiRouteError, withApiErrorHandler } from '@/lib/api/error-handler'

export const POST = withApiErrorHandler(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getTranslator(req.headers.get('accept-language'));

  const caller = req.headers.get('x-user')
  if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
    throw new ApiRouteError(401, 'UNAUTHORIZED', t('errors.unauthorized_missing_header') || 'Unauthorized')
  }

  const { id: billId } = await params;
  if (!billId) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.missing_bill_id') || 'Missing bill id')
  }

  const xdr = await buildPayBillTx(caller, billId)
  return NextResponse.json({ xdr })
})
