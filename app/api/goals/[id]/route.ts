import { getGoal, ContractReadError } from "@/lib/contracts/savings-goal";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // ← note Promise
) {
  try {
    const { id } = await context.params; // ← unwrap

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
    console.error(`GET /api/goals/${await context.params} error:`, error);
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