import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/client/apiClient";
import { AUTH_ME_URL, useTenant } from "@/lib/hooks/useTenant";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTenant", () => {
  it("resolves the tenant from the authenticated session", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue(jsonResponse({ address: "GABC123", expiresAt: 999 }));

    const { result } = renderHook(() => useTenant());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(get).toHaveBeenCalledWith(AUTH_ME_URL);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.tenant).toEqual({ tenantId: "GABC123", expiresAt: 999 });
    expect(result.current.error).toBeNull();
  });

  it("treats a 401 as signed-out, not an error", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(
      jsonResponse({ error: "Unauthorized" }, 401),
    );

    const { result } = renderHook(() => useTenant());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.tenant).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets an error for a malformed 200 response", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(jsonResponse({}));

    const { result } = renderHook(() => useTenant());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe("Malformed session response");
  });

  it("stops loading without setting a tenant when apiClient returns null", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(null);

    const { result } = renderHook(() => useTenant());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tenant).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
