import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { buildUpdateSpendingLimitTx } from "@/lib/contracts/family-wallet";

async function putHandler(
  request: NextRequest,
  address: string,
  { params }: { params: { id: string } },
) {
  const memberId = params?.id;
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  let body: { limit?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body?.limit == null) {
    return NextResponse.json({ error: "limit is required" }, { status: 400 });
  }

  try {
    const xdr = await buildUpdateSpendingLimitTx(address, memberId, body.limit);
    return NextResponse.json({ xdr });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Failed to build transaction" }, { status });
  }
}

export function PUT(
  request: NextRequest,
  context: { params: { id: string } },
) {
  return withAuth((req, addr) => putHandler(req, addr, context))(request);
}

export function POST(
  request: NextRequest,
  context: { params: { id: string } },
) {
  return withAuth((req, addr) => putHandler(req, addr, context))(request);
}
