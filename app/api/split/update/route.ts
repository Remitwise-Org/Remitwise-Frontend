import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { buildUpdateSplitTx } from '@/lib/contracts/remittance-split';
import { ValidationError } from '@/lib/validation/percentages';
import { splitPercentagesSchema } from '@/lib/validation/split-schemas';
import { createValidationError } from '@/lib/errors/api-errors';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await getSession(request);
    
    if (!session || !session.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body with Zod
    const rawBody = await request.json().catch(() => null);
    if (rawBody === null) {
      return createValidationError('Invalid JSON in request body');
    }

    const parsed = splitPercentagesSchema.safeParse(rawBody);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return createValidationError('Request validation failed', fieldErrors);
    }

    const { spending, savings, bills, insurance } = parsed.data;

    // 3. Build transaction using session address as caller
    const result = await buildUpdateSplitTx(
      session.address,
      { spending, savings, bills, insurance },
      { simulate: true }
    );

    // 4. Return success response
    return NextResponse.json({
      success: true,
      xdr: result.xdr,
      simulate: result.simulate,
      message: 'Transaction built successfully. Please sign with your wallet and submit to the network.',
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return createValidationError(error.message);
    }

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
