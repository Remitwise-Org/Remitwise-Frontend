import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { buildUpdateSplitTx } from '@/lib/contracts/remittance-split';
import { PercentagesSchema, StellarAddressSchema } from '@/lib/validation/percentages';
import { createValidationError } from '@/lib/errors/api-errors';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await getSession(request);
    
    if (!session || !session.authenticated || !session.address) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate session address
    const sessionValidation = StellarAddressSchema.safeParse(session.address);
    if (!sessionValidation.success) {
      return createValidationError('Invalid session address', sessionValidation.error.flatten().fieldErrors);
    }

    // 2. Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate body using Zod schema
    const result = PercentagesSchema.safeParse(body);
    if (!result.success) {
      const errors = {
        form: result.error.flatten().formErrors,
        field: result.error.flatten().fieldErrors,
      };
      return createValidationError('Validation Error', errors);
    }

    // 3. Extract percentages
    const { spending, savings, bills, insurance } = result.data;

    // 4. Build transaction using session address as caller
    const txResult = await buildUpdateSplitTx(
      session.address,
      { spending, savings, bills, insurance },
      { simulate: true } // Include simulation for cost estimation
    );

    // 5. Return success response
    return NextResponse.json({
      success: true,
      xdr: txResult.xdr,
      simulate: txResult.simulate,
      message: 'Transaction built successfully. Please sign with your wallet and submit to the network.',
    });

  } catch (error) {
    // Handle other errors
    console.error('Update split error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
