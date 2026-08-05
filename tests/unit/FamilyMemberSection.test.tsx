/**
 * Regression coverage for the useMemo refactor in FamilyMemberSection:
 * the derived stats (total limit/used, near-limit count) and the
 * usedPercentage-descending member order must render identically to the
 * pre-refactor inline reduce/filter/sort.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FamilyMemberSection, {
  familyMembers,
} from "../../app/family/components/FamilyMemberSection";
import { ToastProvider } from "../../lib/context/ToastContext";

function renderSection() {
  return render(
    <ToastProvider>
      <FamilyMemberSection />
    </ToastProvider>
  );
}

describe("FamilyMemberSection", () => {
  it("renders the correct remaining-budget and near-limit stats", () => {
    renderSection();

    const totalLimit = familyMembers.reduce((sum, m) => sum + m.spendingLimit, 0);
    const totalUsed = familyMembers.reduce((sum, m) => sum + m.used, 0);
    const remaining = totalLimit - totalUsed;
    const nearLimitCount = familyMembers.filter((m) => m.usedPercentage >= 75).length;

    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

    expect(screen.getByText(formatter.format(remaining))).toBeInTheDocument();
    expect(screen.getByText(String(nearLimitCount))).toBeInTheDocument();
    expect(screen.getByText(String(familyMembers.length))).toBeInTheDocument();
  });

  it("orders members by usedPercentage descending", () => {
    renderSection();

    const expectedOrder = [...familyMembers]
      .sort((a, b) => b.usedPercentage - a.usedPercentage)
      .map((m) => m.name);

    const renderedNames = expectedOrder.map((name) => screen.getByText(name));
    for (let i = 1; i < renderedNames.length; i++) {
      // Each name must appear later in the document than the previous one.
      expect(
        renderedNames[i - 1].compareDocumentPosition(renderedNames[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });
});
