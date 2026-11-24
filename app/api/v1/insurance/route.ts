import { NextRequest } from "next/server";
import { NextResponse } from 'next/server'
import { getTranslator } from '../../../../lib/i18n'
import { buildCreatePolicyTx } from '../../../../lib/contracts/insurance'
import { getActivePolicies } from '../../../../lib/contracts/insurance-cached'
import { StrKey } from '@stellar/stellar-sdk'
import { ApiRouteError, withApiErrorHandler } from '@/lib/api/error-handler'
import { isValidPaginationCursor, paginateData, validatePaginationParams } from '@/lib/utils/pagination'

export const GET = withApiErrorHandler(async function GET(req: NextRequest) {
  const t = getTranslator(req);
  const caller = req.headers.get('x-user')
  if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
    throw new ApiRouteError(401, 'UNAUTHORIZED', t('errors.unauthorized_missing_header') || 'Unauthorized')
  }

  const { searchParams } = new URL(req.url);
  const policies = await getActivePolicies(caller);
  const limitParam = searchParams.get('limit');
  const cursorParam = searchParams.get('cursor') || undefined;

  if (limitParam === null && !searchParams.has('cursor')) {
    return NextResponse.json({ policies });
  }

  const parsedLimit = limitParam === null ? undefined : Number(limitParam);
  if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid pagination limit');
  }
  const { limit, cursor } = validatePaginationParams({ limit: parsedLimit, cursor: cursorParam });
  const orderedPolicies = [...policies].sort(
    (a, b) =>
      Date.parse(a.nextPaymentDate) - Date.parse(b.nextPaymentDate) ||
      a.id.localeCompare(b.id)
  );
  if (!isValidPaginationCursor(orderedPolicies, cursor, (policy) => policy.id)) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid pagination cursor');
  }

  return NextResponse.json(
    paginateData(orderedPolicies, limit, (policy) => policy.id, cursor)
  );
});

export const POST = withApiErrorHandler(async function POST(req: NextRequest) {
  const t = getTranslator(req);

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
