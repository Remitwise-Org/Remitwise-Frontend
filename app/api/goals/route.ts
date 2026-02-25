import { NextRequest, NextResponse } from 'next/server';
import { buildCreateGoalTx } from '@/lib/contracts/savings-goals';
import { getSessionFromRequest, getPublicKeyFromSession } from '@/lib/auth/session';
import { withApiLogger } from '@/lib/api-logger-middleware';
import {
  createValidationError,
  createAuthenticationError,
  handleUnexpectedError
} from '@/lib/errors/api-errors';
import {
  validateAmount,
  validateFutureDate,
  validateGoalName
} from '@/lib/validation/savings-goals';
import { ApiSuccessResponse } from '@/lib/types/savings-goals';

export const POST = withApiLogger(async (request) => {
  try {
    // Authenticate user
    const session = getSessionFromRequest(request);
    if (!session) {
      return createAuthenticationError('Authentication required', 'Please provide a valid session');
    }

    let publicKey: string;
    try {
      publicKey = getPublicKeyFromSession(session);
    } catch (error) {
      return createAuthenticationError('Invalid session', 'Session does not contain a valid public key');
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createValidationError('Invalid request body', 'Request body must be valid JSON');
    }

    const { name, targetAmount, targetDate } = body;

    // Validate name
    if (!name) {
      return createValidationError('Missing required field', 'Goal name is required');
    }
    const nameValidation = validateGoalName(name);
    if (!nameValidation.isValid) {
      return createValidationError('Invalid goal name', nameValidation.error);
    }

    // Validate target amount
    if (targetAmount === undefined || targetAmount === null) {
      return createValidationError('Missing required field', 'Target amount is required');
    }
    const amountValidation = validateAmount(targetAmount);
    if (!amountValidation.isValid) {
      return createValidationError('Invalid target amount', amountValidation.error);
    }

    // Validate target date
    if (!targetDate) {
      return createValidationError('Missing required field', 'Target date is required');
    }
    const dateValidation = validateFutureDate(targetDate);
    if (!dateValidation.isValid) {
      return createValidationError('Invalid target date', dateValidation.error);
    }

    // Build transaction
    const result = await buildCreateGoalTx(publicKey, name, targetAmount, targetDate);

    // Return success response
    const response: ApiSuccessResponse = {
      xdr: result.xdr
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleUnexpectedError(error);
  }
});
