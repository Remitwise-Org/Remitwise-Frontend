


import { useState, useTransition, useCallback } from "react";
import { ActionState } from "@/lib/auth/middleware";
import { apiClient } from "@/lib/client/apiClient";


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
          const res = await apiClient.request(url, { method, body: formData });
          if (!res) return; // Handled by session expiry flow
          
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