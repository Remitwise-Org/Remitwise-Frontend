import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./locales/en.json", () => ({
  default: {
    errors: { generic: "Something went wrong.", network: "Network error." },
    dashboard: { title: "Dashboard" },
  },
}));

vi.mock("./locales/es.json", () => ({
  default: {
    errors: { generic: "Algo salió mal." },
    dashboard: { title: "Panel" },
  },
}));

beforeEach(() => {
  vi.resetModules();
});

describe("getPendingTranslationKeys", () => {
  it("returns English keys missing from the other locale", async () => {
    const { getPendingTranslationKeys } = await import("./pending-translations");
    expect(getPendingTranslationKeys()).toEqual(["errors.network"]);
  });

  it("returns an empty array when every English key has a translation", async () => {
    vi.doMock("./locales/es.json", () => ({
      default: {
        errors: { generic: "Algo salió mal.", network: "Error de red." },
        dashboard: { title: "Panel" },
      },
    }));

    const { getPendingTranslationKeys } = await import("./pending-translations");
    expect(getPendingTranslationKeys()).toEqual([]);
  });
});
