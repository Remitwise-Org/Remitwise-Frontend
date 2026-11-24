import { NextRequest, NextResponse } from "next/server";
import { LRUCache } from "lru-cache";
import { logDebug, logError } from "@/lib/logger";

export const CSP_REPORT_MAX_BYTES = 8 * 1024;

const KNOWN_DIRECTIVES = new Set([
  "default-src",
  "script-src",
  "script-src-elem",
  "script-src-attr",
  "style-src",
  "style-src-elem",
  "style-src-attr",
  "img-src",
  "font-src",
  "connect-src",
  "media-src",
  "object-src",
  "child-src",
  "frame-src",
  "worker-src",
  "manifest-src",
  "base-uri",
  "form-action",
  "frame-ancestors",
  "navigate-to",
  "sandbox",
  "report-uri",
  "report-to",
]);

const recentReports = new LRUCache<string, true>({
  max: 500,
  ttl: 60 * 1000,
});

function normalizeDirective(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const directive = value.trim().toLowerCase();
  return KNOWN_DIRECTIVES.has(directive) ? directive : null;
}

function extractReports(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && "csp-report" in body) {
    return [body];
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (record.type === "csp-violation" || "body" in record) {
      return [body];
    }
  }
  return [];
}

function extractViolation(report: unknown): Record<string, unknown> | null {
  if (!report || typeof report !== "object") return null;
  const record = report as Record<string, unknown>;

  if (record["csp-report"] && typeof record["csp-report"] === "object") {
    const legacy = record["csp-report"] as Record<string, unknown>;
    const directive = normalizeDirective(
      legacy["effective-directive"] ?? legacy["violated-directive"],
    );
    if (!directive) return null;
    return {
      effectiveDirective: directive,
      blockedURL: legacy["blocked-uri"],
      documentURL: legacy["document-uri"],
      disposition: legacy.disposition,
    };
  }

  if (record.body && typeof record.body === "object") {
    const body = record.body as Record<string, unknown>;
    const directive = normalizeDirective(
      body.effectiveDirective ?? body["effective-directive"],
    );
    if (!directive) return null;
    return {
      effectiveDirective: directive,
      blockedURL: body.blockedURL ?? body["blocked-uri"],
      documentURL: body.documentURL ?? record.url,
      disposition: body.disposition,
    };
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();
  if (
    contentType !== "application/csp-report" &&
    contentType !== "application/reports+json"
  ) {
    return NextResponse.json(
      { error: "Unsupported Content-Type" },
      { status: 415 },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > CSP_REPORT_MAX_BYTES) {
    return NextResponse.json({ error: "Payload Too Large" }, { status: 413 });
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid report body" }, { status: 400 });
  }
  if (new TextEncoder().encode(text).byteLength > CSP_REPORT_MAX_BYTES) {
    return NextResponse.json({ error: "Payload Too Large" }, { status: 413 });
  }
  if (!text.trim()) {
    return NextResponse.json({ error: "Invalid report body" }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid report body" }, { status: 400 });
  }

  let accepted = 0;
  for (const report of extractReports(parsed)) {
    const violation = extractViolation(report);
    if (!violation) continue;

    const key = JSON.stringify(violation);
    if (recentReports.has(key)) continue;
    recentReports.set(key, true);
    accepted++;

    try {
      logDebug("CSP violation report", {
        type: "csp-violation",
        ...violation,
      });
    } catch (error) {
      logError(
        "csp-report",
        "POST",
        "/api/csp-report",
        error instanceof Error ? error : new Error(String(error)),
        500,
      );
    }
  }

  void accepted;
  return new NextResponse(null, { status: 204 });
}
