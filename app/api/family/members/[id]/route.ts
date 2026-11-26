import { NextRequest, NextResponse } from "next/server";
import { getMember } from "@/lib/contracts/family-wallet";
import { resolveContractId } from "@/lib/contracts/network-resolution";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function requireAuth(request: NextRequest): string | NextResponse {
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const headerAddress =
    request.headers.get("x-user") ??
    request.headers.get("x-stellar-public-key");
  if (headerAddress) return headerAddress;
  return unauthorized();
}

/**
 * GET /api/family/members/[id]
 * Returns a single family member by id, or 404 when not found.
 * Returns 503 when the family-wallet contract id is not configured.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    resolveContractId("FAMILY_WALLET");
  } catch {
    return NextResponse.json(
      {
        error: "Service Unavailable",
        message: "Family wallet contract ID is not configured for this network.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;
  const member = await getMember(id);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  return NextResponse.json({ member });
}
