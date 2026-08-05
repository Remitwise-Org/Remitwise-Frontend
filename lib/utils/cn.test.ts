import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class values and drops falsy ones", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("resolves conflicting Tailwind utilities in favor of the last one", () => {
    expect(cn("bg-red-500", "bg-gray-700")).toBe("bg-gray-700");
  });

  it("supports the conditional-ternary usage pattern it replaces", () => {
    const enabled = true;
    expect(cn(enabled ? "bg-[#DC2626]" : "bg-zinc-700", "rounded-full")).toBe(
      "bg-[#DC2626] rounded-full",
    );
  });
});
