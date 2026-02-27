import { NextResponse } from 'next/server'
import { getTranslator } from '../../../../lib/i18n'
import { buildCreateBillTx } from '../../../../lib/contracts/bill-payments'
import { StrKey } from '@stellar/stellar-sdk'
import { ApiRouteError, withApiErrorHandler } from '@/lib/api/error-handler'
import { auditLog, createAuditEvent, extractIp, AuditAction } from '@/lib/audit'

export const POST = withApiErrorHandler(async function POST(req: Request) {
  const t = getTranslator(req.headers.get('accept-language'));

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

  // For non-recurring bills, pass 0 as frequencyDays (it won't be used)
  const numFrequencyDays = frequencyDays ? Number(frequencyDays) : 0;
  const xdr = await buildCreateBillTx(caller, name, numAmount, dueDate, Boolean(recurring), numFrequencyDays)
  
  // Log bill creation
  await auditLog(
    createAuditEvent(AuditAction.BILL_CREATE, 'success', {
      address: caller,
      ip: extractIp(req),
      metadata: {
        name,
        amount: numAmount,
        dueDate,
        recurring,
      },
    })
  );
  
  return NextResponse.json({ xdr })
})
