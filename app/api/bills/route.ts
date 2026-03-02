
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compose, validatedRoute, withAuth } from "@/lib/auth/middleware";

const billSchema = z.object({
  name: z.string().min(4, "Name is too short"),
  amount: z.coerce.number().positive().gt(0),
  dueDate: z.coerce.date(),
  recurring: z.preprocess((val) => val === "on" || val === true, z.boolean()),
});

const addBillHandler = validatedRoute(billSchema, "body", async (req, data) => {
  // data is fully typed as { name: string, amount: number, dueDate: Date, recurring: boolean }
//   console.log(data, 'data in handler');

  // your DB logic here

  return NextResponse.json({
    success: "Bill added successfully",
    name: data.name,
    amount: data.amount,
  });
});

// if auth is needed on a route
// compose auth + validation — order matters: auth runs first
// export const POST = compose(withAuth)(addBillHandler);

// if you don't need auth on a route, just export directly:
// export const POST = addBillHandler;
// import { withAuth } from '@/lib/auth';

async function getHandler(request: NextRequest) {
  // TODO: Fetch bills from Soroban bill_payments contract
  return NextResponse.json({ bills: [] });
}


export const GET = compose(withAuth)(getHandler);
export const POST = compose(withAuth)(addBillHandler);
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getAllBills, getBill } from '@/lib/contracts/bill-payments';
import { jsonSuccess, jsonError } from '@/lib/api/types';

async function getHandler(request: NextRequest, session: string) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const unpaidOnly = searchParams.get('unpaid') === 'true';
    const owner = searchParams.get('owner') ?? session;

    // GET /api/bills?id=1 — return single bill
    if (id) {
      try {
        const bill = await getBill(id, owner);
        return jsonSuccess({ bill });
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'not-found') {
          return jsonError('NOT_FOUND', 'Bill not found');
        }
        throw err;
      }
    }

    // GET /api/bills — return all or unpaid bills
    const bills = await getAllBills(owner);
    const result = unpaidOnly ? bills.filter((b) => b.status !== 'paid') : bills;
    return jsonSuccess({ bills: result });
  } catch (err) {
    console.error('[GET /api/bills]', err);
    return jsonError('INTERNAL_ERROR', 'Failed to fetch bills');
  }
}

async function postHandler(request: NextRequest, session: string) {
  try {
    const body = await request.json();
    const { name, amount, dueDate, recurring, frequencyDays } = body;

    if (!name || typeof name !== 'string') {
      return jsonError('VALIDATION_ERROR', 'name is required');
    }
    if (!(amount > 0)) {
      return jsonError('VALIDATION_ERROR', 'amount must be greater than 0');
    }
    if (!dueDate || Number.isNaN(Date.parse(dueDate))) {
      return jsonError('VALIDATION_ERROR', 'dueDate must be a valid ISO date string');
    }
    if (recurring && !(frequencyDays > 0)) {
      return jsonError('VALIDATION_ERROR', 'frequencyDays must be greater than 0 when recurring is true');
    }

    return jsonSuccess({
      message: 'Validation passed. Use POST /api/bills with owner public key to build XDR.',
    });
  } catch (err) {
    console.error('[POST /api/bills]', err);
    return jsonError('INTERNAL_ERROR', 'Failed to process bill creation');
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
