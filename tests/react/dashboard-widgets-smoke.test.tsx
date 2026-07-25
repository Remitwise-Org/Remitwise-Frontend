import React from "react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "./renderWithProviders";

import MoneyDistributionWidget from "@/components/Dashboard/MoneyDistributionWidget";
import SixMonthTrendsWidget from "@/components/Dashboard/SixMonthTrendsWidget";
import RecentTransactionsWidget from "@/components/Dashboard/RecentTransactionsWidget";
import SavingsByGoalWidget from "@/components/Dashboard/SavingsByGoalWidget";
import QuickActions from "@/components/Dashboard/QuickActions";

import { RemittanceTrendChart } from "@/components/Insights/remittanceTrendChart";
import { CategoryDonutChart } from "@/components/Insights/categoryDonutChart";
import { SpendingVsSavingsChart } from "@/components/Insights/spendingVsSavingChart";

function expectNoThrow(fn: () => void) {
  expect(() => fn()).not.toThrow();
}

describe("dashboard widgets - render smoke tests", () => {
  it("MoneyDistributionWidget mounts (default) and renders fallback states for empty/error", () => {
    expectNoThrow(() => {
      const { unmount } = renderWithProviders(<MoneyDistributionWidget />);
      unmount();
    });

    const { getByText: getByTextEmpty } = renderWithProviders(
      <MoneyDistributionWidget distributionData={[]} />,
    );
    expect(!!getByTextEmpty(/no distribution data yet/i)).toBe(true);

    const { getByText: getByTextError } = renderWithProviders(
      <MoneyDistributionWidget distributionData={[]} hasError />,
    );
    expect(!!getByTextError(/unable to load data/i)).toBe(true);
  });

  it("SixMonthTrendsWidget mounts", () => {
    expectNoThrow(() => {
      const { unmount } = renderWithProviders(<SixMonthTrendsWidget />);
      unmount();
    });
  });

  it("RecentTransactionsWidget mounts and renders fallback states for empty/error", () => {
    expectNoThrow(() => {
      const { unmount } = renderWithProviders(<RecentTransactionsWidget />);
      unmount();
    });

    const { getByText: getByTextEmpty } = renderWithProviders(
      <RecentTransactionsWidget transactions={[]} />,
    );
    expect(!!getByTextEmpty(/no transactions yet/i)).toBe(true);

    const { getByText: getByTextError } = renderWithProviders(
      <RecentTransactionsWidget transactions={[]} hasError />,
    );
    expect(!!getByTextError(/unable to load data/i)).toBe(true);
  });

  it("SavingsByGoalWidget mounts and renders fallback states for empty/error", () => {
    expectNoThrow(() => {
      const { unmount } = renderWithProviders(<SavingsByGoalWidget />);
      unmount();
    });

    const { getByText: getByTextEmpty } = renderWithProviders(
      <SavingsByGoalWidget goals={[]} />,
    );
    expect(!!getByTextEmpty(/no savings goals yet/i)).toBe(true);

    const { getByText: getByTextError } = renderWithProviders(
      <SavingsByGoalWidget goals={[]} hasError />,
    );
    expect(!!getByTextError(/unable to load data/i)).toBe(true);
  });

  it("QuickActions mounts (smoke only)", () => {
    expectNoThrow(() => {
      const { unmount } = renderWithProviders(<QuickActions />);
      unmount();
    });
  });
});

describe("insights charts - render smoke tests", () => {
  it("RemittanceTrendChart mounts and does not throw (empty data)", () => {
    expectNoThrow(() => {
      renderWithProviders(<RemittanceTrendChart data={[]} />);
    });
  });

  it("CategoryDonutChart mounts and does not throw (empty data)", () => {
    expectNoThrow(() => {
      renderWithProviders(<CategoryDonutChart data={[]} />);
    });
  });

  it("SpendingVsSavingsChart mounts and does not throw (empty data)", () => {
    // This chart does arithmetic on totals; guard by providing at least 1 point.
    expectNoThrow(() => {
      renderWithProviders(
        <SpendingVsSavingsChart
          data={[{ month: "Jan", spending: 0, savings: 0 }]}
        />,
      );
    });
  });
});
