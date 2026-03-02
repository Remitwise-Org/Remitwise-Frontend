
import { getAllGoals } from "@/lib/contracts/savings-goal";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth'; 

import { validatePaginationParams, paginateData, PaginatedResult } from '../../../lib/utils/pagination';
import { buildCreateGoalTx } from '@/lib/contracts/savings-goals';
import {
  createValidationError,
  handleUnexpectedError
} from '@/lib/errors/api-errors';
import {
  validateAmount,
  validateFutureDate,
  validateGoalName
} from '@/lib/validation/savings-goals';
import { ApiSuccessResponse } from '@/lib/types/savings-goals';


export async function GET(req: Request) {
  try {
    const publicKey = req.headers.get("x-public-key");

    if (!publicKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const goals = await getAllGoals(publicKey);

    return NextResponse.json(goals, { status: 200 });

  } catch (error) {
    console.error("GET /api/goals error:", error);

    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}




// ===== Goal Interface & Mock Data =====
interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

const mockGoals: Goal[] = [
  { id: '1', title: 'Emergency Fund', targetAmount: 10000, currentAmount: 4500, deadline: '2024-12-31', createdAt: '2023-01-15', updatedAt: '2023-06-20' },
  { id: '2', title: 'Vacation Trip', targetAmount: 5000, currentAmount: 1200, deadline: '2024-08-15', createdAt: '2023-03-10', updatedAt: '2023-07-01' },
  { id: '3', title: 'New Car', targetAmount: 25000, currentAmount: 8000, deadline: '2025-06-30', createdAt: '2023-02-20', updatedAt: '2023-08-15' },
];

// ===== Auth-wrapped GET =====
async function getHandler(request: NextRequest, session: string) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const cursorParam = url.searchParams.get('cursor');

    const paginationParams = {
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
      cursor: cursorParam || undefined,
    };

    const { limit, cursor } = validatePaginationParams(paginationParams);

    const paginatedResult: PaginatedResult<Goal> = paginateData(
      mockGoals,
      limit,
      (item) => item.id,
      cursor
    );

    return NextResponse.json(paginatedResult);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

// ===== Auth-wrapped POST =====
async function postHandler(request: NextRequest, session: string) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return createValidationError('Invalid request body', 'Request body must be valid JSON');
    }

    const { name, targetAmount, targetDate } = body;

    if (!name) {
      return createValidationError('Missing required field', 'Goal name is required');
    }
    const nameValidation = validateGoalName(name);
    if (!nameValidation.isValid) {
      return createValidationError('Invalid goal name', nameValidation.error);
    }

    if (targetAmount === undefined || targetAmount === null) {
      return createValidationError('Missing required field', 'Target amount is required');
    }
    const amountValidation = validateAmount(targetAmount);
    if (!amountValidation.isValid) {
      return createValidationError('Invalid target amount', amountValidation.error);
    }

    if (!targetDate) {
      return createValidationError('Missing required field', 'Target date is required');
    }
    const dateValidation = validateFutureDate(targetDate);
    if (!dateValidation.isValid) {
      return createValidationError('Invalid target date', dateValidation.error);
    }

    // session already validated by withAuth → use as publicKey
    const result = await buildCreateGoalTx(session, name, targetAmount, targetDate);

    const response: ApiSuccessResponse = { xdr: result.xdr };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleUnexpectedError(error);
  }
}

export const GET = withAuth(getHandler);

export const POST = withAuth(postHandler);
