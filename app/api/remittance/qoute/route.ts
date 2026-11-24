/**
 * Legacy compatibility alias for `/api/remittance/quote`.
 * @deprecated Use `/api/remittance/quote` instead.
 */

import type { NextRequest } from "next/server";
import { GET as quoteGET } from "../quote/route";

const SUNSET_DATE = "Tue, 01 Jun 2027 00:00:00 GMT";

export async function GET(req: NextRequest): Promise<Response> {
  const response = await quoteGET(req);
  const headers = new Headers(response.headers);
  headers.set("Deprecation", "true");
  headers.set("Sunset", SUNSET_DATE);
  headers.set("Link", '</api/remittance/quote>; rel="successor-version"');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
