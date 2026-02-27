import { NextRequest, NextResponse } from "next/server";
import { getTranslator } from "@/lib/i18n";
import { getPolicy } from "@/lib/contracts/insurance-cached";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";

// GET /api/insurance/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const policy = await getPolicy(id);
    return NextResponse.json({ policy });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "NOT_FOUND"
    ) {
      const t = getTranslator(request.headers.get("accept-language"));
      return NextResponse.json({ error: t("errors.policy_not_found") }, { status: 404 });
    }

    console.error("[GET /api/insurance/[id]]", error);
    const t = getTranslator(request.headers.get("accept-language"));
    return NextResponse.json(
      { error: t("errors.internal_server_error") },
      { status: 502 }
    );
  }
}