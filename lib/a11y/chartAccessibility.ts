/**
 * Accessibility utilities for Recharts visualizations.
 * 
 * Generates accessible names and summaries for charts using aria-label and sr-only patterns.
 * All functions are locale-aware and format numbers/percentages according to the user's locale.
 */

/**
 * Represents a data point with name and amount for pie/donut charts.
 */
interface PieChartDataPoint {
  name: string;
  amount?: number;
  value?: number;
  displayPercent?: string;
  percentage?: number;
}

/**
 * Represents a data point with month/date and multiple series values.
 */
interface TrendChartDataPoint {
  [key: string]: string | number | undefined;
  month?: string;
  date?: string;
}

/**
 * Generates an aria-label for a pie or donut chart from its data.
 * 
 * @param title - Chart title (e.g. "Money Distribution")
 * @param data - Array of pie chart data points
 * @returns Accessible label summarizing the chart content
 * 
 * @example
 * generatePieChartLabel("Money Distribution", [
 *   { name: "Savings", value: 40, displayPercent: "40%" },
 *   { name: "Bills", value: 35, displayPercent: "35%" },
 *   { name: "Spending", value: 25, displayPercent: "25%" }
 * ])
 * // Returns: "Money Distribution: Savings 40 percent, Bills 35 percent, Spending 25 percent"
 */
export function generatePieChartLabel(
  title: string,
  data: PieChartDataPoint[]
): string {
  if (!data || data.length === 0) {
    return `${title}: No data available`;
  }

  const items = data.map((item) => {
    const percent = item.displayPercent || item.percentage || 0;
    // Remove % symbol if present for cleaner screen reader output
    const percentStr = String(percent).replace('%', '').trim();
    return `${item.name} ${percentStr} percent`;
  });

  return `${title}: ${items.join(', ')}`;
}

/**
 * Generates an sr-only summary for a pie or donut chart data.
 * Provides detailed breakdown with amounts and percentages.
 * 
 * @param data - Array of pie chart data points
 * @returns Formatted string suitable for sr-only display
 */
export function generatePieChartSummary(data: PieChartDataPoint[]): string {
  if (!data || data.length === 0) {
    return "No chart data available.";
  }

  const items = data.map((item) => {
    const amount = item.amount ? `$${formatCurrency(item.amount)}` : "—";
    const percent = item.displayPercent || item.percentage || 0;
    const percentStr = String(percent).replace('%', '').trim();
    return `${item.name}: ${amount}, ${percentStr} percent`;
  });

  return items.join(". ");
}

/**
 * Generates an aria-label for a line, area, or bar chart with trend data.
 * 
 * @param title - Chart title (e.g. "6-Month Trends")
 * @param data - Array of trend data points
 * @param seriesKeys - Names of data series to include (e.g. ["remittances", "savings"])
 * @returns Accessible label summarizing the chart content
 * 
 * @example
 * generateTrendChartLabel("6-Month Trends", chartData, ["remittances", "savings"])
 * // Returns: "6-Month Trends: July remittances $2800 savings $1200, August remittances..."
 */
export function generateTrendChartLabel(
  title: string,
  data: TrendChartDataPoint[],
  seriesKeys: string[]
): string {
  if (!data || data.length === 0) {
    return `${title}: No data available`;
  }

  // Include first 2 months and last 1 month as summary
  const summaryData = [
    data[0],
    ...(data.length > 2 ? [data[Math.floor(data.length / 2)]] : []),
    ...(data.length > 1 ? [data[data.length - 1]] : []),
  ].filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicates

  const items = summaryData.map((point) => {
    const period = point.month || point.date || "Unknown";
    const values = seriesKeys
      .map((key) => {
        const value = point[key];
        if (value === undefined || value === null) return null;
        const formatted = formatCurrency(Number(value));
        return `${key} $${formatted}`;
      })
      .filter(Boolean)
      .join(", ");

    return `${period} ${values}`;
  });

  return `${title}: ${items.join("; ")}`;
}

/**
 * Generates an sr-only summary for trend chart data.
 * Provides a detailed breakdown of all periods and values.
 * 
 * @param data - Array of trend data points
 * @param seriesKeys - Names of data series to include
 * @returns Formatted string suitable for sr-only display
 */
export function generateTrendChartSummary(
  data: TrendChartDataPoint[],
  seriesKeys: string[]
): string {
  if (!data || data.length === 0) {
    return "No chart data available.";
  }

  const items = data.map((point) => {
    const period = point.month || point.date || "Unknown";
    const values = seriesKeys
      .map((key) => {
        const value = point[key];
        if (value === undefined || value === null) return null;
        const formatted = formatCurrency(Number(value));
        return `${key} $${formatted}`;
      })
      .filter(Boolean)
      .join(", ");

    return `${period}: ${values}`;
  });

  return items.join(". ");
}

/**
 * Generates an aria-label for a bar or column chart comparing two series.
 * 
 * @param title - Chart title (e.g. "Spending vs Savings")
 * @param data - Array of bar chart data points
 * @param series1Key - First series key (e.g. "spending")
 * @param series2Key - Second series key (e.g. "savings")
 * @returns Accessible label summarizing the chart content
 */
export function generateBarChartLabel(
  title: string,
  data: TrendChartDataPoint[],
  series1Key: string,
  series2Key: string
): string {
  if (!data || data.length === 0) {
    return `${title}: No data available`;
  }

  // Include first, middle, and last data points
  const summaryData = [
    data[0],
    ...(data.length > 2 ? [data[Math.floor(data.length / 2)]] : []),
    ...(data.length > 1 ? [data[data.length - 1]] : []),
  ].filter((item, index, arr) => arr.indexOf(item) === index);

  const items = summaryData.map((point) => {
    const period = point.month || point.date || "Unknown";
    const val1 = point[series1Key]
      ? `${series1Key} $${formatCurrency(Number(point[series1Key]))}`
      : "";
    const val2 = point[series2Key]
      ? `${series2Key} $${formatCurrency(Number(point[series2Key]))}`
      : "";
    const values = [val1, val2].filter(Boolean).join(", ");
    return `${period} ${values}`;
  });

  return `${title}: ${items.join("; ")}`;
}

/**
 * Generates an sr-only summary for bar chart data.
 * 
 * @param data - Array of bar chart data points
 * @param series1Key - First series key
 * @param series2Key - Second series key
 * @returns Formatted string suitable for sr-only display
 */
export function generateBarChartSummary(
  data: TrendChartDataPoint[],
  series1Key: string,
  series2Key: string
): string {
  if (!data || data.length === 0) {
    return "No chart data available.";
  }

  const items = data.map((point) => {
    const period = point.month || point.date || "Unknown";
    const val1 = point[series1Key]
      ? `${series1Key} $${formatCurrency(Number(point[series1Key]))}`
      : "";
    const val2 = point[series2Key]
      ? `${series2Key} $${formatCurrency(Number(point[series2Key]))}`
      : "";
    const values = [val1, val2].filter(Boolean).join(", ");
    return `${period}: ${values}`;
  });

  return items.join(". ");
}

/**
 * Formats a number as currency using the user's locale.
 * Falls back to English USD format if locale is unavailable.
 * 
 * @param value - Number to format
 * @param locale - Locale string (e.g. "en-US", "es-ES"). Defaults to "en-US".
 * @returns Formatted currency string without $ symbol
 */
export function formatCurrency(value: number, locale = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback for invalid locale
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

/**
 * Formats a percentage value for screen readers.
 * Removes trailing zeros and returns a clean number string.
 * 
 * @param value - Percentage value (0-100 or as decimal)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | string): string {
  if (typeof value === "string") {
    return value.replace("%", "").trim();
  }
  return Math.round(value).toString();
}
