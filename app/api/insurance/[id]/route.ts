import { NextRequest, NextResponse } from "next/server";
import { getPolicy } from "@/lib/contracts/insurance";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";
import { withApiLogger } from "@/lib/api-logger-middleware";

// GET /api/insurance/:id
export const GET = withApiLogger(async (
  request,
  context,
) => {
  const { id } = await context.params! as unknown as { id: string };
  if (!validateAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const policy = await getPolicy(id);
    return NextResponse.json({ policy });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "NOT_FOUND"
    ) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    console.error("[GET /api/insurance/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch policy from contract" },
      { status: 502 }
    );
  }
});