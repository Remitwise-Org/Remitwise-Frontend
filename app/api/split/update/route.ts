import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { buildUpdateSplitTx } from '@/lib/contracts/remittance-split';
import { validateStellarAddress, validatePercentages, ValidationError } from '@/lib/validation/percentages';
import { withApiErrorHandler, ApiRouteError } from '@/lib/api/error-handler';

/**
 * POST split configuration.
 *
 * The POST contract is the four-way split: spending/savings/bills/insurance.
 * GET /api/split is a read view: savings/bills/insurance/family.
 */
export async function postHandler(request: NextRequest) {
  const session = await getSession(request);
  if (!session || !session.authenticated || !session.address) {
    throw new ApiRouteError(401, 'UNAUTHORIZED', 'Unauthorized');
  }

  try {
    validateStellarAddress(session.address);
  } catch (error) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', error instanceof Error ? error.message : 'Invalid session address');
  }

  const contentType = request.headers.get('content-type');
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw new ApiRouteError(400, 'BAD_REQUEST', 'Request body must use application/json');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiRouteError(400, 'BAD_REQUEST', 'Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object');
  }

  const data = body as Record<string, unknown>;
  const allowed = ['spending', 'savings', 'bills', 'insurance'];
  const extraFields = Object.keys(data).filter((key) => !allowed.includes(key));
  const missingFields = allowed.filter((key) => !(key in data));
  if (extraFields.length > 0) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', `Unexpected fields: ${extraFields.join(', ')}`);
  }
  if (missingFields.length > 0) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', `Missing required fields: ${missingFields.join(', ')}`);
  }

  const percentages = {
    spending: data.spending,
    savings: data.savings,
    bills: data.bills,
    insurance: data.insurance,
  } as Record<string, unknown>;

  if (Object.values(percentages).some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new ApiRouteError(400, 'VALIDATION_ERROR', 'All percentages must be finite numbers');
  }

  const split = percentages as unknown as { spending: number; savings: number; bills: number; insurance: number };

  try {
    validatePercentages(split);
  } catch (error) {
    if (error instanceof ValidationError) {
      const status = error.message.startsWith('Percentages must sum to 100') ? 422 : 400;
      throw new ApiRouteError(status, status === 422 ? 'INVALID_PERCENTAGE_SUM' : 'VALIDATION_ERROR', error.message);
    }
    throw error;
  }

  const txResult = await buildUpdateSplitTx(session.address, split, { simulate: true });
  return NextResponse.json({ xdr: txResult.xdr });
}

export const POST = withApiErrorHandler(postHandler);
