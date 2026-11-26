import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { buildAddMemberTx, getAllMembers } from "@/lib/contracts/family-wallet";
import { resolveContractId } from "@/lib/contracts/network-resolution";
import type { AddMemberRequest } from "@/utils/types/family-wallet.types";

async function getHandler(_request: NextRequest, address: string) {
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

  const members = await getAllMembers(address);
  return NextResponse.json({ members });
}

async function postHandler(request: NextRequest, address: string) {
  let body: AddMemberRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { address: memberAddress, role, spendingLimit } = body ?? {};

  if (!memberAddress || !role || spendingLimit == null) {
    return NextResponse.json(
      { error: "address, role, and spendingLimit are required" },
      { status: 400 },
    );
  }

  try {
    const xdr = await buildAddMemberTx(address, memberAddress, role, spendingLimit);
    return NextResponse.json({ xdr });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Failed to build transaction" }, { status });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
