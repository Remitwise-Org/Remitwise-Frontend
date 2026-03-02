
"use client";

import { useState, useTransition, useCallback } from "react";
import { ActionState } from "@/lib/auth/middleware";


// Merge the base with whatever extra fields your specific route returns
export function useFormAction<T extends ActionState = ActionState>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST"
) {
  const [state, setState] = useState<T>({} as T);
  const [isPending, startTransition] = useTransition();

  const formAction = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        try {
          const res = await fetch(url, { method, body: formData });
          const data: T = await res.json();
          setState(data);
        } catch {
          setState({ error: "Network error. Please try again." } as T);
        }
      });
    },
    [url, method]
  );

  return [state, formAction, isPending] as const;
}