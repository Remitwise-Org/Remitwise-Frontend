import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getAllBills, getBill } from '@/lib/contracts/bill-payments';
import { jsonSuccess, jsonError } from '@/lib/api/types';
import { isValidPaginationCursor, paginateData, validatePaginationParams } from '@/lib/utils/pagination';

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
    const limitParam = searchParams.get('limit');
    const cursorParam = searchParams.get('cursor') || undefined;

    if (limitParam !== null || searchParams.has('cursor')) {
      const parsedLimit = limitParam === null ? undefined : Number(limitParam);
      if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
        return jsonError('VALIDATION_ERROR', 'Invalid pagination limit');
      }

      const { limit, cursor } = validatePaginationParams({
        limit: parsedLimit,
        cursor: cursorParam,
      });
      if (!isValidPaginationCursor(result, cursor, (bill) => bill.id)) {
        return jsonError('VALIDATION_ERROR', 'Invalid pagination cursor');
      }

      return NextResponse.json(
        paginateData(
          [...result].sort(
            (a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate) || a.id.localeCompare(b.id)
          ),
          limit,
          (bill) => bill.id,
          cursor
        )
      );
    }

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
