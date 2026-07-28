# API route decorators

Audience: **contributor** adding or editing a route handler under `app/api/`.

This page is the one-stop list of every route-handler decorator (higher-order
function that wraps a Next.js route handler) in this codebase, and when to
reach for each one. For the global CORS/security-header/body-size middleware
that runs ahead of all of these on every `/api` request, see
[docs/API_MIDDLEWARE.md](./API_MIDDLEWARE.md) — that's a different layer and
is not covered here.

## `withAuth` — require an authenticated caller

**File:** `lib/auth.ts:47`

Wraps a handler so it only runs for an authenticated request, and hands the
handler the caller's Stellar address. It accepts, in order:

1. `Authorization: Bearer <AUTH_SECRET>` (service-to-service calls)
2. `x-user` / `x-stellar-public-key` headers (used in tests/tooling)
3. The `iron-session` cookie session (normal browser requests)

If none match, it returns a `401` via `unauthorizedResponse()` — the handler
body never runs.

**Use it when:** the route must only be reachable by a signed-in wallet
address, and the handler needs that address.

```ts
// app/api/goals/route.ts
import { withAuth } from "@/lib/auth";

async function getHandler(request: NextRequest, address: string) {
  return NextResponse.json(await getGoalsForAddress(address));
}

export const GET = withAuth(getHandler);
```

Real call sites: `app/api/split/route.ts`, `app/api/goals/route.ts`,
`app/api/bills/route.ts`, `app/api/family/route.ts`, `app/api/send/route.ts`.

> There is a second, unused `withAuth`/`compose` pair in
> `lib/auth/middleware.ts:133,157`. Nothing in `app/api` imports them — prefer
> the `lib/auth.ts` version above for new routes.

## `validatedRoute` — parse and validate input with Zod

**File:** `lib/auth/middleware.ts:84`

Wraps a handler so the request body (or query string) is parsed and validated
against a Zod schema before the handler runs. On failure it returns a `400`
with a `validationErrors` array; on success the handler receives the typed,
parsed data instead of the raw request.

**Use it when:** the route accepts a POST/PUT/PATCH body or GET query params
that need schema validation, and you want the `400` handling done for you.

```ts
// app/api/insurance/route.ts
import { validatedRoute } from "@/lib/auth/middleware";

const billSchema = z.object({
  policyName: z.string().min(4, "Name is too short"),
  coverageType: z.enum(["Health", "Emergency", "Life"]),
  monthlyPremium: z.coerce.number().positive(),
  coverageAmount: z.coerce.number().positive(),
});

export const POST = validatedRoute(billSchema, "body", async (req, data) => {
  return NextResponse.json({ success: "Insurance added", ...data });
});
```

Pass `"query"` as the second argument for `GET` routes that validate search
params instead of a JSON body (see `app/api/remittance/quote/route.ts`).

## `withApiErrorHandler` — normalize thrown errors into an error envelope

**File:** `lib/api/error-handler.ts:66`

Wraps a handler in a `try/catch`. Any thrown `ContractError`/`ApiRouteError`/
generic `Error` is converted (via `mapError`) into a consistent JSON error
envelope (`{ success: false, error: { code, message } }`) with the right HTTP
status, and every response — success or failure — gets an `x-request-id`
header for tracing.

**Use it when:** the handler calls into contract/service code that throws on
failure (instead of returning a response itself), and you want uniform error
shapes without a `try/catch` in every handler.

```ts
// app/api/v1/bills/route.ts
import { withApiErrorHandler } from "@/lib/api/error-handler";

export const POST = withApiErrorHandler(async function POST(req: NextRequest) {
  const result = await payBill(req); // throws ContractError on failure
  return NextResponse.json({ success: true, result });
});
```

Real call sites: `app/api/v1/bills/route.ts`, `app/api/v1/bills/[id]/pay/route.ts`,
`app/api/v1/insurance/route.ts`.

## Combining decorators

These three answer different questions (*who's calling?*, *is the input
valid?*, *what if it throws?*) and are not mutually exclusive, but no current
route composes more than one — each `app/api/**/route.ts` file picks whichever
one matches what the handler needs. If a route needs more than one, wrap
outermost-first, e.g. `withApiErrorHandler(withAuth(handler))` so auth failures
still get a request ID.

## Quick reference

| Decorator | File | Problem it solves | Failure response |
| --- | --- | --- | --- |
| `withAuth` | `lib/auth.ts:47` | Require a signed-in caller | `401` |
| `validatedRoute` | `lib/auth/middleware.ts:84` | Validate body/query with Zod | `400` |
| `withApiErrorHandler` | `lib/api/error-handler.ts:66` | Normalize thrown errors | Mapped status via `mapError` |
