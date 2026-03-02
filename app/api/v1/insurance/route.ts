import { NextResponse } from 'next/server'
import { getTranslator } from '../../../../lib/i18n'
import { buildCreatePolicyTx } from '../../../../lib/contracts/insurance'
import { StrKey } from '@stellar/stellar-sdk'
import { ApiRouteError, withApiErrorHandler } from '@/lib/api/error-handler'

export const POST = withApiErrorHandler(async function POST(req: Request) {
  const t = getTranslator(req.headers.get('accept-language'));

  const caller = req.headers.get('x-user')
  if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
    throw new ApiRouteError(401, 'UNAUTHORIZED', t('errors.unauthorized_missing_header') || 'Unauthorized')
  }

  const body = await req.json()
  const { name, coverageType, monthlyPremium, coverageAmount } = body || {}

  if (!name || typeof name !== 'string') {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.invalid_name') || 'Invalid name')
  }
  if (!coverageType || typeof coverageType !== 'string') {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.invalid_coverage_type') || 'Invalid coverageType')
  }

  const mp = Number(monthlyPremium)
  const ca = Number(coverageAmount)
  if (!(mp > 0)) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.invalid_monthly_premium') || 'Invalid monthlyPremium; must be > 0')
  }
  if (!(ca > 0)) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.invalid_coverage_amount') || 'Invalid coverageAmount; must be > 0')
  }

  const xdr = await buildCreatePolicyTx(caller, name, coverageType, mp, ca)
  return NextResponse.json({ xdr })
})
