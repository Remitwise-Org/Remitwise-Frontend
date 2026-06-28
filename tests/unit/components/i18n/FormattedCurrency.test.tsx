import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FormattedCurrency, FormattedNumber, useFormatter } from "@/components/i18n";

/**
 * Tests for the React-layer wrappers around the shared formatter.
 *
 * The hook under test (`useClientLocale`) reads from `document.cookie`. To
 * keep these tests deterministic we stub the cookie lookup in each test by
 * stubbing `document.cookie` via a `defineProperty` getter.
 */

function setLocaleCookie(value: string | null) {
  if (typeof document === "undefined") return;
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => (value ? `remitwise_locale=${value}` : ""),
  });
}

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setLocaleCookie(null);
});

describe("FormattedCurrency", () => {
  it("renders a USD value in the en-US format by default", () => {
    setLocaleCookie("en");
    render(<FormattedCurrency data-testid="money" value={1234.5} currency="USD" />);
    const node = screen.getByTestId("money");
    expect(node.textContent).toBe("$1,234.50");
    expect(node.getAttribute("data-i18n-locale")).toBe("en-US");
  });

  it("renders a USD value with Spanish formatting when locale='es'", () => {
    setLocaleCookie("en");
    render(<FormattedCurrency data-testid="money" value={1234.5} currency="USD" locale="es" />);
    const node = screen.getByTestId("money");
    const text = node.textContent ?? "";
    expect(text).toMatch(/1[.,\u202F]?234[.,]50/);
    expect(text).toContain("$");
  });

  it("falls back to '<number> <CODE>' for unknown currency codes", () => {
    setLocaleCookie("en");
    render(<FormattedCurrency data-testid="money" value={1234.5} currency="USDC" />);
    expect(screen.getByTestId("money").textContent).toBe("1,234.50 USDC");
  });

  it("forwards className and other span props", () => {
    setLocaleCookie("en");
    render(
      <FormattedCurrency
        data-testid="money"
        className="text-primary-600 tabular-nums"
        title="Total balance"
        value={42}
        currency="USD"
      />
    );
    const node = screen.getByTestId("money");
    expect(node.className).toContain("text-primary-600");
    expect(node.className).toContain("tabular-nums");
    expect(node.getAttribute("title")).toBe("Total balance");
  });

  it("supports the children-as-function render-prop API", () => {
    setLocaleCookie("en");
    render(
      <FormattedCurrency value={99.95} currency="USD">
        {(formatted) => <strong data-testid="money">{formatted}</strong>}
      </FormattedCurrency>
    );
    expect(screen.getByTestId("money").textContent).toBe("$99.95");
    expect(screen.getByTestId("money").tagName).toBe("STRONG");
  });
});

describe("FormattedNumber", () => {
  it("renders a plain decimal with the active locale", () => {
    setLocaleCookie("en");
    render(
      <FormattedNumber
        data-testid="n"
        value={1234567.89}
        maximumFractionDigits={2}
      />
    );
    expect(screen.getByTestId("n").textContent).toBe("1,234,567.89");
  });

  it("renders a percentage using the percent style", () => {
    setLocaleCookie("en");
    render(<FormattedNumber data-testid="n" value={0.42} style="percent" />);
    expect(screen.getByTestId("n").textContent).toMatch(/42\s?%/);
  });

  it("strips trailing zeros when stripTrailingZeros is true", () => {
    setLocaleCookie("en");
    render(<FormattedNumber data-testid="n" value={500} stripTrailingZeros />);
    expect(screen.getByTestId("n").textContent).toBe("500");
  });

  it("respects an explicit locale override", () => {
    setLocaleCookie("en");
    render(
      <FormattedNumber
        data-testid="n"
        value={1234567.89}
        locale="es-ES"
        maximumFractionDigits={2}
      />
    );
    const node = screen.getByTestId("n");
    const text = node.textContent ?? "";
    // Recent Node Intl uses NNBSP (\u202F) for es-ES thousands; older
    // implementations used a dot. The Spanish browser also accepts a comma.
    // Accept any of these so the test remains implementation-agnostic.
    expect(text).toMatch(/1[\s,.\u202F]234[\s,.\u202F]567[,.]89/);
    expect(node.getAttribute("data-i18n-locale")).toBe("es-ES");
  });

  it("emits the active BCP-47 locale in data-i18n-locale when no override is passed", () => {
    setLocaleCookie("es");
    render(
      <FormattedNumber
        data-testid="n"
        value={1234567.89}
        maximumFractionDigits={2}
      />
    );
    expect(screen.getByTestId("n").getAttribute("data-i18n-locale")).toBe("es-ES");
  });
});

describe("useFormatter", () => {
  it("returns locale-aware helpers bound to the cookie locale", () => {
    setLocaleCookie("es");
    function Probe({ id }: { id: string }) {
      const fmt = useFormatter();
      return (
        <span data-testid={id}>
          {fmt.locale}|{fmt.formatCurrency(1234.5, { currency: "USD" })}
        </span>
      );
    }
    render(<Probe id="probe" />);
    const text = screen.getByTestId("probe").textContent ?? "";
    expect(text.startsWith("es|")).toBe(true);
    expect(text).toMatch(/es\|.*1[.,\u202F]?234[.,]50/);
  });
});
