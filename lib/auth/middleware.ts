import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {getSession} from "@/lib/session"

export type ActionState = {
  error?: string;
  success?: string;
  validationErrors?: { path: string; message: string }[];
  [key: string]: any; // This allows for additional properties
};

// type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
//   data: z.infer<S>,
//   formData: FormData
// ) => Promise<T>;

// export function validatedAction<S extends z.ZodType<any, any>, T>(
//   schema: S,
//   action: ValidatedActionFunction<S, T>
// ) {
//   return async (prevState: ActionState, formData: FormData) => {
//     const result = schema.safeParse(Object.fromEntries(formData));
//     console.log(result, 'result')
//     if (!result.success) {
//       return { validationErrors: result.error.issues.map((err)=> ({message: err.message, path: err.path[0]})) };
//     }

//     return action(result.data, formData);
//   };
// }



// type RouteHandler<S extends z.ZodType<any, any>> = (
//   req: NextRequest,
//   data: z.infer<S>
// ) => Promise<NextResponse>;

type RouteHandler<T> = (
  req: NextRequest,
  data: T
) => Promise<NextResponse>;

type Source = "body" | "query"


// export function validatedRoute<S extends z.ZodType<any, any>>(
//   schema: S,
//   handler: RouteHandler<S>
// ) {
//   return async (req: NextRequest) => {
//     const contentType = req.headers.get("content-type") || "";

//     const raw = contentType.includes("application/json")
//       ? await req.json()
//       : Object.fromEntries(await req.formData());

//     const result = schema.safeParse(raw);
//     console.log(result, 'result')

//     if (!result.success) {
//       return NextResponse.json(
//         {
//           validationErrors: result.error.issues.map((err) => ({
//             message: err.message,
//             path: err.path[0],
//           })),
//           // ...(result.data ? { fields: result.data })
//         },
//         { status: 400 }
//       );
//     }

//     return handler(req, result.data);
//   };
// }

/**
 * @param schema      Zod schema to validate against
 * @param source      "body"  → parse JSON request body (POST/PUT/PATCH)
 *                    "query" → parse URL search params  (GET)
 * @param handler     Called with validated data + original NextRequest
 */
export function validatedRoute<T extends z.ZodType>(
  schema: T,
  source: Source = "body",
  handler: RouteHandler<z.infer<T>>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    let raw: Record<string, unknown>;
        const contentType = req.headers.get("content-type") || "";

//     const raw = contentType.includes("application/json")
//       ? await req.json()
//       : Object.fromEntries(await req.formData());

    try {
      if (source === "query") {
        // Convert URLSearchParams → plain object
        raw = Object.fromEntries(req.nextUrl.searchParams.entries());
      } else {
        if(contentType.includes("application/json")) raw = await req.json();
        else raw = Object.fromEntries(await req.formData())
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid request: could not parse input" },
        { status: 400 }
      );
    }

    const result = schema.safeParse(raw);

        if (!result.success) {
      return NextResponse.json(
        {
          validationErrors: result.error.issues.map((err) => ({
            message: err.message,
            path: err.path[0],
          })),
          // ...(result.data ? { fields: result.data })
        },
        { status: 400 },
      );
    }

    return handler(req, result.data);
  };
}

type NextHandler = (req: NextRequest, address: string) => Promise<NextResponse>;

export function withAuth(handler: NextHandler) {
  return async (req: NextRequest) => {
    // const authHeader = req.headers.get("authorization") ?? "";
    // const token = authHeader.startsWith("Bearer ")
    //   ? authHeader.slice(7).trim()
    //   : null;

    // if (!token) {
    //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    // }

    const session = await getSession();
      if (!session?.address) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Not authenticated' },
          { status: 401 }
        );
      }
    
    return handler(req, session.address);
  };
}

// compose multiple middlewares left to right
export function compose(
  ...middlewares: Array<(h: NextHandler) => NextHandler>
) {
  return (handler: NextHandler): NextHandler =>
    middlewares.reduceRight((acc, mw) => mw(acc), handler);
}
