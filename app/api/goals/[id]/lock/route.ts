// POST /api/goals/[id]/lock - Lock a savings goal

import { NextRequest, NextResponse } from 'next/server';
import { buildLockGoalTx } from '@/lib/contracts/savings-goals';
import { getSessionFromRequest, getPublicKeyFromSession } from '@/lib/auth/session';
import {
  createValidationError,
  createAuthenticationError,
  handleUnexpectedError
} from '@/lib/errors/api-errors';
import { validateGoalId } from '@/lib/validation/savings-goals';
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
    
    // Build transaction
    const result = await buildLockGoalTx(publicKey, goalId);
    
    // Return success response
    const response: ApiSuccessResponse = {
      xdr: result.xdr
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
