import { NextRequest, NextResponse } from 'next/server';
import { StellarTransactionBuilder } from '../../../../../../services/transaction-builder-service';
import { getSession } from '../../../../../../lib/session';
import { PolicyService } from '../../../../../../services/policy-service';
import { EventStorageService } from '../../../../../../services/event-storage-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.address) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { destinationAccount, amount, assetCode, assetIssuer, memo } = body;

    if (!destinationAccount || !amount) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing destinationAccount or amount' },
        { status: 400 }
      );
    }

    const eventStorage = new EventStorageService();
    const policyService = new PolicyService(eventStorage);

    const validationResult = await policyService.validateEmergencyTransfer({
      userId: session.address,
      amount,
      assetCode: assetCode || 'XLM',
    });

    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Policy Violation', message: validationResult.errors.join(', ') },
        { status: 400 }
      );
    }

    const builder = new StellarTransactionBuilder();
    const xdr = await builder.buildEmergencyTransfer({
      sourceAccount: session.address,
      destinationAccount,
      amount, // Note: service converts to stroops/XLM as needed
      assetCode,
      assetIssuer,
      memo,
      emergency: true,
    });

    return NextResponse.json({ xdr });
  } catch (error: any) {
    console.error('Error in emergency build API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
