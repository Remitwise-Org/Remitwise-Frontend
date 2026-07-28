import { getGoal, ContractReadError } from "@/lib/contracts/savings-goal";
import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GoalRouteContext = {
  params: Promise<{ id?: string }>;
};

async function getGoalId(context: GoalRouteContext): Promise<string | null> {
  const params = await context.params;
  return params?.id ?? null;
}

export async function GET(
  req: NextRequest,
  context: GoalRouteContext
) {
  try {
    const id = await getGoalId(context);
    if (!id) {
      return NextResponse.json(
        { error: "Goal id is required" },
        { status: 400 }
      );
    }

    const publicKey = req.headers.get("x-public-key");

    if (!publicKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const goal = await getGoal(id);

    if (!goal) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(goal, { status: 200 });
  } catch (error) {
    console.error("GET /api/goals/[id] error:", error);
    if (error instanceof ContractReadError) {
      return NextResponse.json(
        { error: "Unable to read goal data. Please try again.", retryable: true },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch goal" },
      { status: 500 }
    );
  }
}
