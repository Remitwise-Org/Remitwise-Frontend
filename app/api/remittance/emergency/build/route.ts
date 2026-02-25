// Emergency Transfer API Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withApiLogger } from '@/lib/api-logger-middleware';
import {
  EmergencyTransferRequest,
  EmergencyTransferResponse,
  ErrorResponse,
  EmergencyTransferErrorCode,
  EmergencyTransferEvent,
} from '@/types/emergency-transfer';
import { validateEmergencyTransferRequest } from '@/utils/validation';
import { PolicyService } from '@/services/policy-service';
import { StellarTransactionBuilder } from '@/services/transaction-builder-service';
import { EventStorageService } from '@/services/event-storage-service';
import { NotificationService } from '@/services/notification-service';

// Initialize services
const policyService = new PolicyService();
const transactionBuilder = new StellarTransactionBuilder();
const eventStorage = new EventStorageService();
const notificationService = new NotificationService();

/**
 * POST /api/remittance/emergency/build
 * Builds an emergency transfer transaction
 */
export const POST = withApiLogger(async (request) => {
  try {
    // 1. Authentication check
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: EmergencyTransferErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: EmergencyTransferRequest = await request.json();

    // 3. Validate request
    const validationErrors = validateEmergencyTransferRequest(body);
    if (validationErrors.length > 0) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: validationErrors[0].code,
            message: validationErrors[0].message,
            details: validationErrors,
          },
        },
        { status: 400 }
      );
    }

    // 4. Check policy limits
    const validation = await policyService.validateEmergencyTransfer({
      userId,
      amount: body.amount,
      assetCode: body.assetCode || 'XLM',
    });

    if (!validation.valid) {
      const errorCode = validation.errors[0].includes('exceeds maximum')
        ? EmergencyTransferErrorCode.AMOUNT_EXCEEDS_LIMIT
        : validation.errors[0].includes('daily')
          ? EmergencyTransferErrorCode.DAILY_LIMIT_EXCEEDED
          : EmergencyTransferErrorCode.MONTHLY_COUNT_EXCEEDED;

      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: errorCode,
            message: validation.errors[0],
            details: validation.errors,
          },
        },
        { status: 422 }
      );
    }

    // 5. Build transaction XDR
    const transactionId = uuidv4();
    const sourceAccount = await getSourceAccountForUser(userId);

    const xdr = await transactionBuilder.buildEmergencyTransfer({
      sourceAccount,
      destinationAccount: body.recipientAddress,
      amount: body.amount,
      assetCode: body.assetCode || 'XLM',
      assetIssuer: body.assetIssuer,
      memo: body.memo,
      emergency: true,
    });

    // 6. Calculate fee
    const fee = await transactionBuilder.calculateEmergencyFee(body.amount);

    // 7. Store event
    const event: EmergencyTransferEvent = {
      id: uuidv4(),
      userId,
      amount: body.amount,
      assetCode: body.assetCode || 'XLM',
      recipientAddress: body.recipientAddress,
      transactionId,
      timestamp: new Date(),
      status: 'pending',
      metadata: {
        memo: body.memo,
        fee,
        emergencyFeeApplied: true,
      },
    };

    await eventStorage.storeEmergencyEvent(event);

    // 8. Send notifications (async, don't wait)
    notificationService
      .notifyFamilyMembers({
        userId,
        amount: body.amount,
        assetCode: body.assetCode || 'XLM',
        timestamp: new Date(),
      })
      .catch(error => {
        console.error('Failed to send notifications:', error);
      });

    // 9. Get limits for response
    const limits = await policyService.getEmergencyLimits(userId);

    // 10. Return success response
    const response: EmergencyTransferResponse = {
      success: true,
      xdr,
      transactionId,
      fee,
      emergencyFeeApplied: true,
      estimatedTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      limits: {
        maxAmount: limits.maxAmountPerTransfer,
        remainingToday: validation.remainingLimits.dailyAmount,
      },
    };

    return NextResponse.json<EmergencyTransferResponse>(response, { status: 200 });
  } catch (error) {
    console.error('Emergency transfer error:', error);

    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: EmergencyTransferErrorCode.TRANSACTION_BUILD_FAILED,
          message: 'Failed to build emergency transfer',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
});

/**
 * Authenticates the request and returns user ID
 */
async function authenticateRequest(request: NextRequest): Promise<string | null> {
  // Check for authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  // In production, this would validate JWT token or API key
  // For now, extract user ID from bearer token
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return null;
  }

  // Mock authentication - in production, verify token and extract user ID
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // return decoded.userId;

  // For demo purposes, return a mock user ID
  return 'user_123';
}

/**
 * Gets source account address for user
 */
async function getSourceAccountForUser(userId: string): Promise<string> {
  // In production, this would query the database for user's Stellar account
  // For now, return a mock address
  return 'GABC123...'; // This would be the user's actual Stellar public key
}
