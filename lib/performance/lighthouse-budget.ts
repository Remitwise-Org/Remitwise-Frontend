export const PERFORMANCE_BUDGET_THRESHOLD = 90;

export function normalizeLighthouseScore(score: number | null | undefined): number {
  return Math.round((score ?? 0) * 100);
}

export function assertDashboardPerformanceBudget(
  score: number | null | undefined,
  threshold = PERFORMANCE_BUDGET_THRESHOLD,
): number {
  const normalized = normalizeLighthouseScore(score);

  if (normalized < threshold) {
    throw new Error(
      `Dashboard Lighthouse performance score ${normalized} is below the required ${threshold}.`,
    );
  }

  return normalized;
}
