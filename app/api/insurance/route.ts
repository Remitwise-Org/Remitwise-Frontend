import { NextRequest, NextResponse } from "next/server";
import { getActivePolicies } from "@/lib/contracts/insurance";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";
import { withApiLogger } from "@/lib/api-logger-middleware";

// GET /api/insurance
// Returns active policies for the authenticated owner.
// Query param: ?owner=G... (Stellar account address)
export const GET = withApiLogger(async (request) => {
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
    const policies = await getActivePolicies(owner);
    return NextResponse.json({ policies });
  } catch (error: unknown) {
    const err = error as { code?: string };

    if (err.code === "INVALID_ADDRESS") {
      return NextResponse.json({ error: "Invalid Stellar address" }, { status: 400 });
    }

    console.error("[GET /api/insurance]", error);
    return NextResponse.json(
      { error: "Failed to fetch policies from contract" },
      { status: 502 }
    );
  }
});