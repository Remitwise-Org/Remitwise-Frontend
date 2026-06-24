import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { calculateSplit } from '@/lib/contracts/remittance-split';
import { z } from 'zod';
import { createValidationError } from '@/lib/errors/api-errors';
import { StellarAddressSchema } from '@/lib/validation/percentages';

const CalculateQuerySchema = z.object({
  amount: z.string({ required_error: 'Amount parameter required' }).refine((val) => {
    const num = Number(val);
    return Number.isInteger(num) && num > 0 && /^\d+$/.test(val);
  }, {
    message: 'Amount must be a positive integer',
  }),
}).strict();

async function handler(request: NextRequest, session: string) {
  // Validate session address format and checksum
  const sessionValidation = StellarAddressSchema.safeParse(session);
  if (!sessionValidation.success) {
    return createValidationError('Invalid session address', sessionValidation.error.flatten().fieldErrors);
  }

  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const result = CalculateQuerySchema.safeParse(params);
  if (!result.success) {
    const errors = {
      form: result.error.flatten().formErrors,
      field: result.error.flatten().fieldErrors,
    };
    return createValidationError('Validation Error', errors);
  }

  try {
    const amount = parseInt(result.data.amount, 10);
    const env = (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const amounts = await calculateSplit(amount, env);

    if (!amounts) {
      return NextResponse.json({ success: false, error: 'Split configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ amounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate split';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const GET = withAuth(handler);
