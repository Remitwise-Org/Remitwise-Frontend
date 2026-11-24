import { NextRequest } from "next/server";
import { NextResponse } from 'next/server'
import { getTranslator } from '../../../../lib/i18n'
import { buildCreateBillTx, getAllBills } from '../../../../lib/contracts/bill-payments'
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
  const bills = await getAllBills(caller);
  const limitParam = searchParams.get('limit');
  const cursorParam = searchParams.get('cursor') || undefined;

  if (limitParam === null && !searchParams.has('cursor')) {
    return NextResponse.json({ bills });
  }

  const parsedLimit = limitParam === null ? undefined : Number(limitParam);
  if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid pagination limit');
  }
  const { limit, cursor } = validatePaginationParams({ limit: parsedLimit, cursor: cursorParam });
  const orderedBills = [...bills].sort(
    (a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate) || a.id.localeCompare(b.id)
  );
  if (!isValidPaginationCursor(orderedBills, cursor, (bill) => bill.id)) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid pagination cursor');
  }

  return NextResponse.json(paginateData(orderedBills, limit, (bill) => bill.id, cursor));
});

export const POST = withApiErrorHandler(async function POST(req: NextRequest) {
  const t = getTranslator(req);

  const caller = req.headers.get('x-user')
  if (!caller || !StrKey.isValidEd25519PublicKey(caller)) {
    throw new ApiRouteError(401, 'UNAUTHORIZED', t('errors.unauthorized_missing_header') || 'Unauthorized')
  }

  const body = await req.json()
  const { name, amount, dueDate, recurring = false, frequencyDays } = body || {}

  if (!name || typeof name !== 'string') {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.invalid_name') || 'Invalid name')
  }
  const numAmount = Number(amount)
  if (!(numAmount > 0)) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.invalid_amount') || 'Invalid amount; must be > 0')
  }
  if (recurring && !(frequencyDays && Number(frequencyDays) > 0)) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.invalid_frequency_days') || 'Invalid frequencyDays for recurring bill')
  }
  if (!dueDate || Number.isNaN(Date.parse(dueDate))) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.invalid_due_date') || 'Invalid dueDate')
  }
  if (Date.parse(dueDate) <= Date.now()) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', t('errors.due_date_in_past') || 'dueDate must be in the future')
  }

  const xdr = await buildCreateBillTx(caller, name, numAmount, dueDate, Boolean(recurring), frequencyDays ? Number(frequencyDays) : undefined)
  return NextResponse.json({ xdr })
})
