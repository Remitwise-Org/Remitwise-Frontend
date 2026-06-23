export type ChartSummaryItem = {
  name: string
  value: string
}

export function buildChartImageLabel(
  title: string,
  summaryItems: string[],
  t: (path: string, options?: string | Record<string, unknown>) => string,
) {
  const summary = summaryItems.length
    ? summaryItems.join(', ')
    : t('charts.noData', 'No data available.')

  const template = t('charts.imageLabel', '{{title}}: {{summary}}')

  return template
    .replace('{{title}}', title)
    .replace('{{summary}}', summary)
}

export function buildChartSummary(
  summaryItems: string[],
  t: (path: string, options?: string | Record<string, unknown>) => string,
) {
  if (!summaryItems.length) {
    return t('charts.noData', 'No data available.')
  }

  return summaryItems.join(', ')
}
