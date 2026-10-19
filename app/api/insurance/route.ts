import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validatedRoute } from "@/lib/auth/middleware";
import { getTranslator } from "@/lib/i18n";
import { getActivePolicies } from "@/lib/contracts/insurance-cached";

const billSchema = z.object({
  policyName: z.string().min(4, "Name is too short"),
  coverageType: z.enum(["Health", "Emergency", "Life"] as const, "Please select a coverage type"),
  monthlyPremium: z.coerce.number().positive().gt(0),
  coverageAmount: z.coerce.number().positive().gt(0)
});

const addInsuranceHandler = validatedRoute(billSchema, "body", async (req, data) => {
  // You could add i18n here for success messages if needed
  // const t = getTranslator(req.headers.get("accept-language"));
  
  // DB logic here

  return NextResponse.json({
    success: "Insurance added successfully",
    policyName: data.policyName,
    coverageType: data.coverageType,
    monthlyPremium: data.monthlyPremium,
    coverageAmount: data.coverageAmount,
  });
});

// GET /api/insurance
// Returns active policies for the authenticated owner.
// Query param: ?owner=G... (Stellar account address)
const getInsuranceHandler = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const t = getTranslator(request);

  if (!owner) {
    return NextResponse.json(
      { error: t("errors.missing_query_owner") },
      { status: 400 }
    );
  }

  try {
    const policies = await getActivePolicies(owner);
    return NextResponse.json({ policies });
  } catch (error: unknown) {
    const err = error as { code?: string };

    if (err.code === "INVALID_ADDRESS") {
      return NextResponse.json(
        { error: t("errors.invalid_stellar_address") }, 
        { status: 400 }
      );
    }

    console.error("[GET /api/insurance]", error);
    return NextResponse.json(
      { error: t("errors.failed_fetch_policies") },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  return addInsuranceHandler(request);
}

export async function GET(request: NextRequest) {
  return getInsuranceHandler(request);
}