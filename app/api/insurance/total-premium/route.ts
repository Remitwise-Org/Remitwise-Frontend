import { NextRequest, NextResponse } from "next/server";
import { getTotalMonthlyPremium } from "@/lib/contracts/insurance-cached";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";

// GET /api/insurance/total-premium?owner=G...
export async function GET(request: NextRequest) {
  if (!validateAuth(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");

  if (!owner) {
    return NextResponse.json(
      { error: "Missing required query parameter: owner" },
      { status: 400 }
    );
  }

  try {
    const totalMonthlyPremium = await getTotalMonthlyPremium(owner);
    return NextResponse.json({ totalMonthlyPremium });
  } catch (error: unknown) {
    const err = error as { code?: string };

    if (err.code === "INVALID_ADDRESS") {
      return NextResponse.json({ error: "Invalid Stellar address" }, { status: 400 });
    }

    console.error("[GET /api/insurance/total-premium]", error);
    return NextResponse.json(
      { error: "Failed to fetch total premium from contract" },
      { status: 502 }
    );
  }
}