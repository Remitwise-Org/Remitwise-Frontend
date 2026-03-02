// POST /api/goals/[id]/add - Add funds to a savings goal

import { NextRequest, NextResponse } from 'next/server';
import { buildAddToGoalTx } from '@/lib/contracts/savings-goals';
import { getSessionFromRequest, getPublicKeyFromSession } from '@/lib/auth/session';
import {
  createValidationError,
  createAuthenticationError,
  handleUnexpectedError
} from '@/lib/errors/api-errors';
import {
  validateAmount,
  validateGoalId
} from '@/lib/validation/savings-goals';
import { ApiSuccessResponse } from '@/lib/types/savings-goals';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    // Validate goal ID from URL params
    const { id: goalId } = await params;
    const goalIdValidation = validateGoalId(goalId);
    if (!goalIdValidation.isValid) {
      return createValidationError('Invalid goal ID', goalIdValidation.error);
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createValidationError('Invalid request body', 'Request body must be valid JSON');
    }
    
    const { amount } = body;
    
    // Validate amount
    if (amount === undefined || amount === null) {
      return createValidationError('Missing required field', 'Amount is required');
    }
    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      return createValidationError('Invalid amount', amountValidation.error);
    }
    
    // Build transaction
    const result = await buildAddToGoalTx(publicKey, goalId, amount);
    
    // Return success response
    const response: ApiSuccessResponse = {
      xdr: result.xdr
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
